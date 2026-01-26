const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const { emitAttendanceUpdate } = require('./socket');
const generateCommitteePdf = require('./utils/generateCommitteePdf')
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const os = require("os");
process.env.TZ = "Asia/Kolkata";



// ============================================
// SYSTEM LOGGING UTILITY
// ============================================
const createSystemLog = async (pool, userId, role, action, entityType, entityId, description, severity = 'INFO') => {
  try {
    await pool.query(
      `INSERT INTO system_logs
       (actor_user_id, actor_role, action, entity_type, entity_id, description, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, role, action, entityType, entityId, description, severity]
    );
  } catch (error) {
    console.error('System log creation error:', error);
  }
};

// Import database models
const { pool, initDB, User, UserProfile, Attendance, WorkReport, LeaveApplication, BiometricRegistration, LoginLog } = require('./models');

// Load environment variables
dotenv.config();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const app = express();
const PORT = process.env.PORT || 5005;

// Initialize database on startup
initDB();

// Security & middleware

app.set('trust proxy', 1);
const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BASE_URL || 'http://localhost:5005';
const ELECTRON_APP_URL = process.env.ELECTRON_APP_URL || 'http://localhost:3010';
// Helmet with strict CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", FRONTEND_URL, BACKEND_URL, "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);
// CORS
app.use(cors({
  origin:  [CLIENT_URL, ELECTRON_APP_URL], 
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (auth endpoints)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth', authLimiter);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
     maxAge: '1d',
     etag: false
   }));

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_URL);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, 'uploads');
    if (file.fieldname === 'profilePicture' || file.fieldname === 'memberPicture') {
      uploadPath = path.join(uploadPath, 'user-pfp');
    } else if (file.fieldname === 'reportFile') {
      uploadPath = path.join(uploadPath, 'reports');
    } else if (file.fieldname === 'leaveFile') {
      uploadPath = path.join(uploadPath, 'leaves');
    }
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = user;
    next();
  }catch (err) {
  return res.status(401).json({
    message: 'Token expired or invalid'
  })
}
}

// Role-based authorization middleware
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

async function findMatchedUserByFingerprint(pool, fingerprintTemplate) {
  const result = await pool.query(`
    SELECT 
      br.user_id,
      br.council_id,
      br.fingerprint_template,
      up.name,
      up.committee_name
    FROM biometric_registrations br
    JOIN user_profiles up ON up.council_id = br.council_id
    WHERE br.is_active = true
  `);

  if (result.rows.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const row of result.rows) {
    const score = calculateSimilarity(fingerprintTemplate, row.fingerprint_template);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }

  if (!bestMatch || bestScore < 85) return null;

  return {
    userId: bestMatch.user_id,
    councilId: bestMatch.council_id,
    name: bestMatch.name,
    committee: bestMatch.committee_name,
    matchScore: bestScore
  };
}
const kioskLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/attendance/kiosk', kioskLimiter);
// Routes
// Authentication Routes
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { councilId, password } = req.body;
    
    const user = await User.findByCouncilId(councilId);
    if (!user || !user.is_active) {
      await createSystemLog(pool, null, 'guest', 'LOGIN_FAILED', 'USER', null, `Failed login attempt for council ID: ${councilId}`, 'WARNING');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await createSystemLog(pool, user.id, user.role, 'LOGIN_FAILED', 'USER', user.id, `Failed login attempt (wrong password)`, 'WARNING');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, councilId: user.council_id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES || '24h' }
    );

    await LoginLog.create(user.id, req.ip, req.get('User-Agent'));

    await createSystemLog(pool, user.id, user.role, 'LOGIN', 'USER', user.id, `User logged in from IP: ${req.ip}`, 'INFO');

    res.json({
      token,
      user: {
        id: user.id,
        councilId: user.council_id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});             

// Admin Routes
app.post('/api/admin/create-user', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { councilId, password, role } = req.body;
    
    const existingUser = await User.findByCouncilId(councilId);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      council_id: councilId,
      password: hashedPassword,
      role: role
    });
    
    await createSystemLog(pool, req.user.userId, req.user.role, 'CREATE', 'USER', newUser.id, `Created user: ${councilId} with role: ${role}`, 'INFO');
    
    res.json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/bulk-create-users', authenticateToken, authorizeRole('admin'), upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file required' });
    }

    const results = [];
    const errors = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', async (data) => {
        try {
          const { 'Council-id': councilId, password, role } = data;
          
          if (!councilId || !password || !role) {
            errors.push(`Missing required fields for row: ${JSON.stringify(data)}`);
            return;
          }

          const existingUser = await User.findByCouncilId(councilId);
          if (existingUser) {
            errors.push(`User ${councilId} already exists`);
            return;
          }

          const newUser = await User.create({
            council_id: councilId,
            password: password,
            role: role
          });

          await createSystemLog(pool, req.user.userId, req.user.role, 'CREATE', 'USER', newUser.id, `Bulk created user: ${councilId} with role: ${role}`, 'INFO');
          
          results.push(newUser);
        } catch (err) {
          errors.push(`Error processing row: ${err.message}`);
        }
      })
      .on('end', async () => {
        fs.unlinkSync(req.file.path);
        
        await createSystemLog(pool, req.user.userId, req.user.role, 'BULK_CREATE', 'USER', null, `Bulk created ${results.length} users from CSV file (${errors.length} errors)`, 'INFO');
        
        res.json({
          message: 'Bulk user creation completed',
          created: results.length,
          errors: errors
        });
      });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/user-stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalUsersRes = await pool.query(
      `SELECT COUNT(*) FROM users WHERE is_active = true`
    )
    const totalUsers = parseInt(totalUsersRes.rows[0].count)

    const activeTodayRes = await pool.query(`
      SELECT COUNT(DISTINCT user_id)
      FROM login_logs
      WHERE login_time::date = CURRENT_DATE
    `)
    const activeToday = parseInt(activeTodayRes.rows[0].count)

    const attendanceCommitteeRes = await pool.query(`
      SELECT 
        COALESCE(up.committee_name, 'Unassigned') AS committee_name, 
        COUNT(DISTINCT up.council_id) AS count
      FROM user_profiles up
      WHERE up.committee_name IS NOT NULL AND TRIM(up.committee_name) != ''
      GROUP BY up.committee_name
      ORDER BY committee_name
    `);

    const committeeStats = {}
    attendanceCommitteeRes.rows.forEach(row => {
      committeeStats[row.committee_name] = parseInt(row.count)
    })

    const committeesRes = await pool.query(`
      SELECT COUNT(DISTINCT committee_name) FROM user_profiles
      WHERE committee_name IS NOT NULL AND TRIM(committee_name) != ''
    `)
    const totalCommittees = parseInt(committeesRes.rows[0].count)

    const attendanceRate =
      totalUsers === 0 ? 0 : Math.round((activeToday / totalUsers) * 100)

    const trendRes = await pool.query(`
      SELECT DATE(punch_in) AS day, COUNT(DISTINCT user_id) AS count
      FROM attendance_logs
      WHERE punch_in::date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `)

    const activityRes = await pool.query(`
      SELECT 'login' AS type, ll.login_time AS time, up.name, up.committee_name
      FROM login_logs ll
      JOIN users u ON u.id = ll.user_id
      JOIN user_profiles up ON up.council_id = u.council_id
      WHERE ll.login_time >= NOW() - INTERVAL '24 hours'

      UNION ALL

      SELECT 'attendance', al.created_at, up.name, up.committee_name
      FROM attendance_logs al
      JOIN users u ON u.id = al.user_id
      JOIN user_profiles up ON up.council_id = u.council_id
      WHERE al.created_at >= NOW() - INTERVAL '24 hours'

      UNION ALL

      SELECT 'report', r.created_at, up.name, up.committee_name
      FROM work_reports r
      JOIN users u ON u.id = r.user_id
      JOIN user_profiles up ON up.council_id = u.council_id
      WHERE r.created_at >= NOW() - INTERVAL '24 hours'

      UNION ALL

      SELECT 'leave', l.created_at, up.name, up.committee_name
      FROM leave_applications l
      JOIN users u ON u.id = l.user_id
      JOIN user_profiles up ON up.council_id = u.council_id
      WHERE l.created_at >= NOW() - INTERVAL '24 hours'

      ORDER BY time DESC
      LIMIT 10
    `)

    const recentActivity = activityRes.rows.map(row => ({
      message: `${row.type.toUpperCase()}: ${row.name} (${row.committee_name})`,
      time: row.time,
      color:
        row.type === 'login'
          ? 'green'
          : row.type === 'attendance'
          ? 'blue'
          : row.type === 'report'
          ? 'purple'
          : 'orange'
    }))

    res.json({
      totalUsers,
      activeToday,
      totalCommittees,
      attendanceRate,
      committeeStats,
      dailyTrend: trendRes.rows,
      recentActivity
    })
  } catch (error) {
    console.error('User stats error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// User Profile Routes
app.post('/api/profiles/create', authenticateToken, authorizeRole('admin'), upload.single('memberPicture'), async (req, res) => {
  try {
    const profileData = req.body;
    const user = await User.findByCouncilId(profileData.councilId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingProfile = await UserProfile.findByCouncilId(user.council_id);

    if (existingProfile) {
      return res.status(400).json({ message: 'Profile already exists' });
    }

    const newProfile = await UserProfile.create({
      council_id: user.council_id,
      member_picture: req.file ? `/uploads/user-pfp/${req.file.filename}` : null,
      name: profileData.name,
      enrollment_number: profileData.enrollmentNumber,
      committee_name: profileData.committeeName,
      position: profileData.position,
      phone_number: profileData.phoneNumber,
      email_id: profileData.emailId,
      address: profileData.address,
      instagram: profileData.instagram,
      discord: profileData.discord,
      linkedin: profileData.linkedin,
      snapchat: profileData.snapchat,
      github: profileData.github
    });

    await createSystemLog(pool, req.user.userId, req.user.role, 'CREATE', 'PROFILE', newProfile.id, `Created profile: ${profileData.name} (${profileData.councilId}) - Committee: ${profileData.committeeName} - Position: ${profileData.position}`, 'INFO');

    res.json({ message: 'Profile created successfully', profile: newProfile });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put(
  '/api/profiles/update',
  authenticateToken,
  upload.single('memberPicture'),
  async (req, res) => {
    try {
      const profileData = req.body;

      const councilId =
        req.user.role === 'admin'
          ? profileData.councilId
          : req.user.councilId;

      if (!councilId) {
        return res.status(400).json({ message: 'Council ID missing' });
      }

      const profile = await UserProfile.findByCouncilId(councilId);

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      if (req.file && profile.member_picture) {
        const oldImagePath = path.join(
          __dirname,
          profile.member_picture.replace('/uploads', 'uploads')
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      const updateData = {};
      const changes = [];

      if (req.user.role !== 'admin') {
        if (profileData.name) { updateData.name = profileData.name; changes.push('name'); }
        if (profileData.phoneNumber) { updateData.phone_number = profileData.phoneNumber; changes.push('phone_number'); }
        if (profileData.emailId) { updateData.email_id = profileData.emailId; changes.push('email_id'); }
        if (profileData.address) { updateData.address = profileData.address; changes.push('address'); }
        if (profileData.instagram) { updateData.instagram = profileData.instagram; changes.push('instagram'); }
        if (profileData.discord) { updateData.discord = profileData.discord; changes.push('discord'); }
        if (profileData.linkedin) { updateData.linkedin = profileData.linkedin; changes.push('linkedin'); }
        if (profileData.snapchat) { updateData.snapchat = profileData.snapchat; changes.push('snapchat'); }
        if (profileData.github) { updateData.github = profileData.github; changes.push('github'); }

        if (req.file) {
          updateData.member_picture = `/uploads/user-pfp/${req.file.filename}`;
          changes.push('member_picture');
        }
      } 
      else {
        Object.entries(profileData).forEach(([key, value]) => {
          if (value !== undefined && key !== 'councilId') {
            updateData[key] = value;
            changes.push(key);
          }
        });

        if (req.file) {
          updateData.member_picture = `/uploads/user-pfp/${req.file.filename}`;
          changes.push('member_picture');
        }
      }

      delete updateData.council_id;
      delete updateData.committee_name;
      delete updateData.position;

      const updatedProfile = await UserProfile.updateByCouncilId(
        councilId,
        updateData
      );

      await createSystemLog(pool, req.user.userId, req.user.role, 'UPDATE', 'PROFILE', updatedProfile.id, `Updated profile for ${councilId}. Changed fields: ${changes.join(', ')}`, 'INFO');

      if (updatedProfile.member_picture) {
        const BASE_URL =
          process.env.BASE_URL || `http://localhost:${PORT}`;
        updatedProfile.member_picture =
          `${BASE_URL}${updatedProfile.member_picture}`;
      }

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


app.get('/api/profiles/my-profile', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findByCouncilId(req.user.councilId);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (profile.member_picture) {
      profile.member_picture =
        `${process.env.BASE_URL || 'http://localhost:5005'}${profile.member_picture}`;
    }

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Attendance Routes
app.post('/api/attendance/punch-in', authenticateToken, async (req, res) => {
  try {
    const attendance = await Attendance.punchIn(req.user.userId);

    const user = await User.findById(req.user.userId);
    const profile = await UserProfile.findByCouncilId(user.council_id);

    await createSystemLog(pool, req.user.userId, req.user.role, 'PUNCH_IN', 'ATTENDANCE', attendance.id, `Punched in - ${profile?.name || 'Unknown'} (${profile?.committee_name || 'No Committee'})`, 'INFO');

    emitAttendanceUpdate({
      type: 'punch_in',
      userId: user.id,
      councilId: user.council_id,
      name: profile?.name || 'Unknown',
      committee: profile?.committee_name || null,
      attendance,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Punched in successfully', attendance });
  } catch (error) {
    console.error('Punch in error:', error);
    res.status(400).json({ message: error.message || 'Failed to punch in' });
  }
});



app.post('/api/attendance/punch-out', authenticateToken, async (req, res) => {
  try {
    const attendance = await Attendance.punchOut(req.user.userId);

    const user = await User.findById(req.user.userId);
    const profile = await UserProfile.findByCouncilId(user.council_id);

    await createSystemLog(pool, req.user.userId, req.user.role, 'PUNCH_OUT', 'ATTENDANCE', attendance.id, `Punched out - ${profile?.name || 'Unknown'} (${profile?.committee_name || 'No Committee'})`, 'INFO');

    emitAttendanceUpdate({
      type: 'punch_out',
      userId: user.id,
      councilId: user.council_id,
      name: profile?.name || 'Unknown',
      committee: profile?.committee_name || null,
      attendance,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Punched out successfully', attendance });
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(400).json({ message: error.message || 'Failed to punch out' });
  }
});

app.get('/api/attendance/my-attendance', authenticateToken, async (req, res) => {
  try {
    const attendance = await Attendance.findByUserId(req.user.userId);
    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Work Report Routes
app.post('/api/reports/submit', authenticateToken, upload.single('reportFile'), async (req, res) => {
  try {
    const { title, content, reportDate } = req.body;

    const newReport = await WorkReport.create({
      user_id: req.user.userId,
      title,
      content,
      report_date: reportDate,
      file_path: req.file
        ? `/uploads/reports/${req.file.filename}`
        : null
    });

    const profile = await UserProfile.findByCouncilId(req.user.councilId);

    await createSystemLog(pool, req.user.userId, req.user.role, 'SUBMIT', 'REPORT', newReport.id, `Submitted report: "${title}" - ${profile?.name || 'Unknown'} (${profile?.committee_name || 'No Committee'}) - Date: ${reportDate}`, 'INFO');

    res.json({ message: 'Report submitted successfully', report: newReport });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/reports/my-reports', authenticateToken, async (req, res) => {
  try {
    const reports = await WorkReport.findByUserId(req.user.userId)

    const BASE_URL = process.env.BASE_URL || 'http://localhost:5005'

    const formatted = reports.map(r => ({
      ...r,
      file_path: r.file_path ? `${BASE_URL}${r.file_path}` : null
    }))

    res.json(formatted)
  } catch (error) {
    console.error('Get reports error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Leave Application Routes
const { emitLeaveUpdate } = require('./socket')

app.post(
  '/api/leaves/apply',
  authenticateToken,
  upload.single('leaveFile'),
  async (req, res) => {
    try {
      const { title, content, leaveFrom, leaveTo } = req.body

      const newLeave = await LeaveApplication.create({
        user_id: req.user.userId,
        title,
        content,
        leave_from: leaveFrom,
        leave_to: leaveTo,
        file_path: req.file
          ? `/uploads/leaves/${req.file.filename}`
          : null
      })

      const profile = await UserProfile.findByCouncilId(req.user.councilId)

      if (!profile || !profile.committee_name) {
        return res.status(400).json({
          message: 'Committee not assigned'
        })
      }

      await createSystemLog(pool, req.user.userId, req.user.role, 'APPLY', 'LEAVE', newLeave.id, `Applied for leave: "${title}" - ${profile.name} (${profile.committee_name}) - From: ${leaveFrom} To: ${leaveTo}`, 'INFO');

      emitLeaveUpdate({
        type: 'new_leave',
        committee: profile.committee_name,
        leaveId: newLeave.id,
        userId: req.user.userId,
        timestamp: new Date().toISOString()
      })

      res.json({
        message: 'Leave application submitted successfully',
        leave: newLeave
      })
    } catch (error) {
      console.error('Apply leave error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

app.get('/api/leaves/my-leaves', authenticateToken, async (req, res) => {
  try {
    const leaves = await LeaveApplication.findByUserId(req.user.userId)

    const BASE_URL = process.env.BASE_URL || 'http://localhost:5005'

    const formatted = leaves.map(l => ({
      ...l,
      file_path: l.file_path ? `${BASE_URL}${l.file_path}` : null
    }))

    res.json(formatted)
  } catch (error) {
    console.error('Get leaves error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.delete('/api/leaves/:id', authenticateToken, async (req, res) => {
  try {
    const leave = await LeaveApplication.findById(req.params.id)

    if (!leave || leave.user_id !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (leave.gs_approval) {
      return res.status(400).json({ message: 'Cannot cancel approved leave' })
    }

    if (leave.file_path) {
      const filePath = path.join(__dirname, leave.file_path)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    const profile = await UserProfile.findByCouncilId(req.user.councilId);

    await createSystemLog(pool, req.user.userId, req.user.role, 'CANCEL', 'LEAVE', leave.id, `Cancelled leave: "${leave.title}" by ${profile?.name || 'Unknown'} (${profile?.committee_name || 'No Committee'})`, 'INFO');

    await LeaveApplication.delete(req.params.id)

    res.json({ message: 'Leave cancelled successfully' })
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ message: 'Failed to cancel leave' });
  }
})

// ============================================
// COMMITTEE HEAD ROUTES (continues from profiles)
// ============================================

app.get(
  '/api/head/committee-insights',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const range = req.query.range === 'monthly' ? 'monthly' : 'weekly'

      const headProfile = await UserProfile.findByCouncilId(req.user.councilId)
      if (!headProfile?.committee_name) {
        return res.status(404).json({ message: 'Committee not assigned' })
      }

      const committee = headProfile.committee_name

      const interval =
        range === 'monthly'
          ? "CURRENT_DATE - INTERVAL '30 days'"
          : "CURRENT_DATE - INTERVAL '7 days'"

      const statsRes = await pool.query(
        `
        SELECT
          COUNT(DISTINCT u.id) AS total_members,

          COUNT(DISTINCT la.id)
            FILTER (WHERE la.head_approval = false) AS pending_leaves,

          COUNT(DISTINCT wr.id)
            FILTER (WHERE wr.status = 'submitted') AS submitted_reports
        FROM user_profiles up
        JOIN users u ON u.council_id = up.council_id
        LEFT JOIN leave_applications la ON la.user_id = u.id
        LEFT JOIN work_reports wr ON wr.user_id = u.id
        WHERE up.committee_name = $1
      `,
        [committee]
      )

      const rateRes = await pool.query(
        `
        SELECT
          COUNT(DISTINCT al.user_id) * 100.0 /
          NULLIF(COUNT(DISTINCT u.id) * ${range === 'monthly' ? 30 : 7}, 0) AS rate
        FROM user_profiles up
        JOIN users u ON u.council_id = up.council_id
        LEFT JOIN attendance_logs al
          ON al.user_id = u.id
         AND al.punch_in >= ${interval}
        WHERE up.committee_name = $1
      `,
        [committee]
      )

      const trendRes = await pool.query(
        `
        SELECT
          DATE(al.punch_in) AS day,
          COUNT(DISTINCT al.user_id) AS count
        FROM attendance_logs al
        JOIN users u ON u.id = al.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE
          up.committee_name = $1
          AND al.punch_in >= ${interval}
        GROUP BY day
        ORDER BY day ASC
      `,
        [committee]
      )

      const leavesRes = await pool.query(
        `
        SELECT
          la.id,
          la.title,
          la.leave_from,
          la.leave_to,
          la.created_at,
          up.name,
          up.council_id
        FROM leave_applications la
        JOIN users u ON u.id = la.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE
          up.committee_name = $1
          AND la.head_approval = false
        ORDER BY la.created_at DESC
      `,
        [committee]
      )

      const stats = statsRes.rows[0]

      res.json({
        totalMembers: Number(stats.total_members),
        attendanceRate: Math.round(rateRes.rows[0]?.rate || 0),
        submittedReports: Number(stats.submitted_reports),
        pendingLeaves: leavesRes.rows,
        attendanceTrend: trendRes.rows.map(r => ({
          day: r.day,
          count: Number(r.count),
        })),
      })
    } catch (err) {
      console.error('Committee insights error:', err)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

app.post(
  '/api/head/committee-export/pdf',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const { chartImage } = req.body

      const profile = await UserProfile.findByCouncilId(req.user.councilId)
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' })
      }

      const membersRes = await pool.query(
        `
        SELECT
          u.council_id,
          up.name,
          up.position
        FROM users u
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE up.committee_name = $1
      `,
        [profile.committee_name]
      )

      const summary = {
        committee: profile.committee_name,
        totalMembers: membersRes.rows.length,
      }

      generateCommitteePdf(res, {
        summary,
        members: membersRes.rows,
        chartImage,
      })
    } catch (err) {
      console.error('PDF export error:', err)
      res.status(500).json({ message: 'PDF export failed' })
    }
  }
)

app.get(
  '/api/head/committee-members',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const headProfile = await UserProfile.findByCouncilId(req.user.councilId)

      if (!headProfile || !headProfile.committee_name) {
        return res.status(400).json({
          message: 'Committee not assigned to head',
        })
      }

      const committee = headProfile.committee_name.trim()

      const members = await pool.query(`
        SELECT
          u.id AS user_id,
          u.council_id,
          up.name,
          up.position,
          COALESCE(
            COUNT(al.id) FILTER (WHERE al.punch_out IS NOT NULL),
            0
          ) AS attendance_days
        FROM users u
        JOIN user_profiles up ON up.council_id = u.council_id
        LEFT JOIN attendance_logs al ON al.user_id = u.id
        WHERE TRIM(up.committee_name) = $1
        GROUP BY u.id, u.council_id, up.name, up.position
        ORDER BY up.name
      `, [committee])

      res.json(members.rows)
    } catch (err) {
      console.error('Committee members error:', err)
      res.status(500).json({ message: 'Failed to load members' })
    }
  }
)

app.post(
  '/api/head/approve-leave/:id',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const leave = await LeaveApplication.findById(req.params.id);
      if (!leave) {
        return res.status(404).json({ message: 'Leave not found' });
      }

      const updatedLeave = await LeaveApplication.updateHeadApproval(req.params.id)
      const applicant = await UserProfile.findByCouncilId((await User.findById(leave.user_id)).council_id);

      await createSystemLog(pool, req.user.userId, req.user.role, 'APPROVE', 'LEAVE', leave.id, `Approved leave: "${leave.title}" by ${applicant?.name || 'Unknown'} (${applicant?.committee_name || 'No Committee'})`, 'INFO');

      emitLeaveUpdate({
        type: 'approved_by_head',
        leaveId: updatedLeave.id,
        userId: updatedLeave.user_id,
        timestamp: new Date().toISOString()
      })

      res.json({ message: 'Approved by head', leave: updatedLeave })
    } catch (error) {
      console.error('Approve leave error:', error)
      res.status(500).json({ message: 'Failed to approve leave' })
    }
  }
)

app.get(
  '/api/head/committee/leaves',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const profile = await UserProfile.findByCouncilId(req.user.councilId)
      if (!profile?.committee_name) {
        return res.status(400).json({ message: 'Committee not assigned' })
      }

      const result = await pool.query(`
        SELECT
          la.id,
          la.title,
          la.content,
          la.leave_from,
          la.leave_to,
          la.head_approval,
          la.gs_approval,
          la.file_path,
          la.created_at,
          up.name,
          up.council_id
        FROM leave_applications la
        JOIN users u ON u.id = la.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE up.committee_name = $1
        ORDER BY la.created_at DESC
      `, [profile.committee_name])

      const BASE_URL = process.env.BASE_URL || 'http://localhost:5005'

      res.json(
        result.rows.map(l => ({
          ...l,
          file_path: l.file_path ? `${BASE_URL}${l.file_path}` : null
        }))
      )
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Failed to fetch leaves' })
    }
  }
)

app.post(
  '/api/head/reject-leave/:leaveId',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const { reason } = req.body
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason required' })
      }

      const leave = await LeaveApplication.findById(req.params.leaveId)
      if (!leave || leave.gs_approval) {
        return res.status(400).json({ message: 'Cannot reject this leave' })
      }

      const applicant = await UserProfile.findByCouncilId((await User.findById(leave.user_id)).council_id);

      await pool.query(`
        UPDATE leave_applications
        SET head_approval = false
        WHERE id = $1
      `, [req.params.leaveId])

      await createSystemLog(pool, req.user.userId, req.user.role, 'REJECT', 'LEAVE', leave.id, `Rejected leave: "${leave.title}" by ${applicant?.name || 'Unknown'} - Reason: ${reason}`, 'WARNING');

      emitLeaveUpdate({
        type: 'rejected_by_head',
        leaveId: leave.id,
        reason
      })

      res.json({ message: 'Leave rejected' })
    } catch (error) {
      console.error('Reject leave error:', error)
      res.status(500).json({ message: 'Failed to reject leave' })
    }
  }
)

app.get(
  '/api/head/committee/reports',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const profile = await UserProfile.findByCouncilId(req.user.councilId)
      if (!profile?.committee_name) {
        return res.status(400).json({ message: 'Committee not assigned' })
      }

      const result = await pool.query(`
        SELECT
          wr.id,
          wr.title,
          wr.content,
          wr.report_date,
          wr.status,
          wr.file_path,
          wr.created_at,
          up.name,
          up.council_id
        FROM work_reports wr
        JOIN users u ON u.id = wr.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE up.committee_name = $1
        ORDER BY wr.created_at DESC
      `, [profile.committee_name])

      const BASE_URL = process.env.BASE_URL || 'http://localhost:5005'

      res.json(
        result.rows.map(r => ({
          ...r,
          file_path: r.file_path ? `${BASE_URL}${r.file_path}` : null
        }))
      )
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Failed to fetch reports' })
    }
  }
)

app.post(
  '/api/head/review-report/:reportId',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const report = await WorkReport.findById(req.params.reportId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      const updated = await WorkReport.updateStatus(
        req.params.reportId,
        'reviewed',
        req.user.userId
      )

      const reportAuthor = await UserProfile.findByCouncilId((await User.findById(report.user_id)).council_id);

      await createSystemLog(pool, req.user.userId, req.user.role, 'REVIEW', 'REPORT', report.id, `Reviewed report: "${report.title}" by ${reportAuthor?.name || 'Unknown'}`, 'INFO');

      res.json({
        message: 'Report reviewed',
        report: updated
      })
    } catch (error) {
      console.error('Review report error:', error)
      res.status(500).json({ message: 'Failed to review report' })
    }
  }
)

app.get(
  '/api/head/notifications/count',
  authenticateToken,
  authorizeRole('committee_head', 'admin'),
  async (req, res) => {
    try {
      const profile = await UserProfile.findByCouncilId(req.user.councilId)

      if (!profile?.committee_name) {
        return res.json({ count: 0 })
      }

      const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM leave_applications la
        JOIN users u ON u.id = la.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE
          up.committee_name = $1
          AND la.head_approval = false
        `,
        [profile.committee_name]
      )

      res.json({ count: result.rows[0].count })
    } catch (err) {
      console.error('Notification count error:', err)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// ============================================
// GS ROUTES
// ============================================

app.get('/api/gs/all-committees-insights', authenticateToken, authorizeRole('gs', 'admin'), async (req, res) => {
  try {
    const committees = await pool.query(
      'SELECT DISTINCT committee_name FROM user_profiles'
    );
    
    const committeeInsights = {};
    
    for (const row of committees.rows) {
      const committee = row.committee_name;
      const members = await pool.query(
        'SELECT user_id FROM user_profiles WHERE committee_name = $1',
        [committee]
      );
      
      const memberIds = members.rows.map(m => m.user_id);
      
      committeeInsights[committee] = {
        totalMembers: members.rows.length,
        pendingLeaves: await LeaveApplication.findPendingForGS(),
        pendingHeadApproval: await LeaveApplication.findPendingForHead(committee),
        attendanceRate: await calculateAttendanceRate(memberIds)
      };
    }

    res.json(committeeInsights);
  } catch (error) {
    console.error('GS insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gs/dashboard/summary', authenticateToken, authorizeRole('gs', 'admin'), async (req, res) => {
  try {
    const committeesRes = await pool.query(
      'SELECT COUNT(DISTINCT committee_name) FROM user_profiles WHERE committee_name IS NOT NULL'
    );
    const totalCommittees = parseInt(committeesRes.rows[0].count) || 0;

    const membersRes = await pool.query(
      'SELECT COUNT(DISTINCT council_id) FROM user_profiles'
    );
    const totalMembers = parseInt(membersRes.rows[0].count) || 0;

    const attendanceRes = await pool.query(`
      SELECT COUNT(DISTINCT user_id) FROM attendance_logs
      WHERE punch_in::date = CURRENT_DATE
    `);
    const todayAttendance = parseInt(attendanceRes.rows[0].count) || 0;

    const pendingLeavesRes = await pool.query(`
      SELECT COUNT(*) FROM leave_applications
      WHERE gs_approval = false AND head_approval = true
    `);
    const pendingLeaves = parseInt(pendingLeavesRes.rows[0].count) || 0;

    res.json({
      totalCommittees,
      totalMembers,
      todayAttendance,
      pendingLeaves
    });
  } catch (error) {
    console.error('❌ GS dashboard summary error:', error);
    res.status(500).json({ 
      message: 'Failed to load summary',
      error: error.message 
    });
  }
});

app.get('/api/gs/committees', authenticateToken, authorizeRole('gs', 'admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT committee_name FROM user_profiles WHERE committee_name IS NOT NULL');
    const committees = result.rows.map(r => r.committee_name).filter(Boolean);
    res.json(committees);
  } catch (err) {
    console.error('Error fetching committees:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get(
  '/api/gs/committee/attendance-analytics',
  authenticateToken,
  authorizeRole('gs', 'committee_head'),
  async (req, res) => {
    try {
      const { committee, startDate, endDate } = req.query

      if (!committee || committee === 'all') {
        return res.status(400).json({ message: 'Committee required' })
      }

      let query = `
        SELECT
          DATE(al.punch_in) AS day,
          COUNT(DISTINCT al.user_id) AS count
        FROM attendance_logs al
        JOIN users u ON u.id = al.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE up.committee_name = $1
      `
      
      const params = [committee]
      let paramIndex = 2

      if (startDate) {
        query += ` AND al.punch_in::date >= $${paramIndex}`
        params.push(startDate)
        paramIndex++
      }

      if (endDate) {
        query += ` AND al.punch_in::date <= $${paramIndex}`
        params.push(endDate)
      }

      query += ` GROUP BY day ORDER BY day ASC`

      const result = await pool.query(query, params)

      res.json(
        result.rows.map(r => ({
          day: r.day,
          count: Number(r.count),
        }))
      )
    } catch (err) {
      console.error('❌ Attendance analytics error:', err)
      res.status(500).json({ 
        message: 'Failed to load analytics',
        error: err.message 
      })
    }
  }
)

app.get(
  '/api/gs/committee/members',
  authenticateToken,
  authorizeRole('gs', 'committee_head'),
  async (req, res) => {
    try {
      const { committee, startDate, endDate } = req.query

      if (!committee || committee === 'all') {
        return res.status(400).json({ message: 'Committee required' })
      }

      let query = `
        SELECT
          u.id,
          u.council_id,
          up.name,
          up.position,
          COUNT(DISTINCT DATE(al.punch_in)) AS attendance_days,
          ROUND(
            COALESCE(
              SUM(
                EXTRACT(EPOCH FROM (al.punch_out - al.punch_in))
              ) / 3600,
              0
            ),
            2
          ) AS total_hours
        FROM users u
        JOIN user_profiles up ON up.council_id = u.council_id
        LEFT JOIN attendance_logs al
          ON al.user_id = u.id
      `

      const params = [committee]
      let paramIndex = 2

      if (startDate) {
        query += ` AND al.punch_in::date >= $${paramIndex}`
        params.push(startDate)
        paramIndex++
      }

      if (endDate) {
        query += ` AND al.punch_in::date <= $${paramIndex}`
        params.push(endDate)
      }

      query += `
        WHERE up.committee_name = $1
        GROUP BY u.id, u.council_id, up.name, up.position
        ORDER BY up.name
      `

      const result = await pool.query(query, params)

      res.json(result.rows)
    } catch (err) {
      console.error('❌ Committee members error:', err)
      res.status(500).json({ 
        message: 'Failed to load members',
        error: err.message 
      })
    }
  }
)

// ============================================
// GS ROUTES - COMPLETE FIX
// ============================================

app.get(
  '/api/gs/leaves/pending',
  authenticateToken,
  authorizeRole('gs', 'admin'),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          la.id,
          la.title,
          la.content,
          la.leave_from,
          la.leave_to,
          la.file_path,
          la.head_approval,
          la.gs_approval,
          la.created_at,
          up.name,
          up.committee_name
        FROM leave_applications la
        JOIN users u ON u.id = la.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE la.head_approval = true
        ORDER BY up.committee_name, la.created_at DESC
      `)

      const BASE_URL = process.env.BASE_URL || 'http://localhost:5005'

      const grouped = {}
      for (const row of result.rows) {
        if (!grouped[row.committee_name]) {
          grouped[row.committee_name] = []
        }

        grouped[row.committee_name].push({
          ...row,
          file_path: row.file_path
            ? `${BASE_URL}${row.file_path}`
            : null
        })
      }

      res.json(grouped)
    } catch (err) {
      console.error('GS pending leaves error:', err)
      res.status(500).json({ message: 'Failed to load pending leaves' })
    }
  }
)

app.get(
  '/api/gs/reports/pending',
  authenticateToken,
  authorizeRole('gs', 'admin'),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          wr.id,
          wr.title,
          wr.content,
          wr.report_date,
          wr.status,
          wr.file_path,
          wr.created_at,
          up.name,
          up.committee_name
        FROM work_reports wr
        JOIN users u ON u.id = wr.user_id
        JOIN user_profiles up ON up.council_id = u.council_id
        WHERE wr.status IN ('reviewed', 'gs_reviewed')
        ORDER BY up.committee_name, wr.created_at DESC
      `)

      const BASE_URL = process.env.BASE_URL || 'http://localhost:5005'
      const grouped = {}

      for (const row of result.rows) {
        const committee = row.committee_name?.trim() || 'Unassigned'

        if (!grouped[committee]) {
          grouped[committee] = []
        }

        grouped[committee].push({
          ...row,
          file_path: row.file_path
            ? `${BASE_URL}${row.file_path}`
            : null
        })
      }

      res.json(grouped)
    } catch (err) {
      console.error('GS pending reports error:', err)
      res.status(500).json({ message: 'Failed to load reports' })
    }
  }
)

app.put(
  '/api/gs/approve-leave/:leaveId',
  authenticateToken,
  authorizeRole('gs', 'admin'),
  async (req, res) => {
    try {
      const leave = await LeaveApplication.findById(req.params.leaveId)
      if (!leave) {
        return res.status(404).json({ message: 'Leave not found' })
      }

      const updated = await LeaveApplication.updateGSApproval(req.params.leaveId)

      const applicant = await UserProfile.findByCouncilId(
        (await User.findById(leave.user_id)).council_id
      )

      await createSystemLog(
        pool,
        req.user.userId,
        req.user.role,
        'GS_APPROVE',
        'LEAVE',
        leave.id,
        `GS approved leave: "${leave.title}" by ${applicant?.name || 'Unknown'} (${applicant?.committee_name || 'No Committee'})`,
        'INFO'
      )

      emitLeaveUpdate({
        type: 'approved_by_gs',
        leaveId: updated.id,
        userId: updated.user_id,
        timestamp: new Date().toISOString()
      })

      res.json({ message: 'Leave approved by GS', leave: updated })
    } catch (err) {
      console.error('GS approve leave error:', err)
      res.status(500).json({ message: 'Failed to approve leave' })
    }
  }
)

app.put(
  '/api/gs/reject-leave/:leaveId',
  authenticateToken,
  authorizeRole('gs', 'admin'),
  async (req, res) => {
    const { reason } = req.body
    if (!reason) {
      return res.status(400).json({ message: 'Reason required' })
    }

    try {
      const leave = await LeaveApplication.findById(req.params.leaveId)
      if (!leave) {
        return res.status(404).json({ message: 'Leave not found' })
      }

      await pool.query(
        `
        UPDATE leave_applications
        SET head_approval = false
        WHERE id = $1 AND gs_approval = false
        `,
        [req.params.leaveId]
      )

      const applicant = await UserProfile.findByCouncilId(
        (await User.findById(leave.user_id)).council_id
      )

      await createSystemLog(
        pool,
        req.user.userId,
        req.user.role,
        'GS_REJECT',
        'LEAVE',
        leave.id,
        `GS rejected leave: "${leave.title}" by ${applicant?.name || 'Unknown'} (${applicant?.committee_name || 'No Committee'}) - Reason: ${reason}`,
        'WARNING'
      )

      emitLeaveUpdate({
        type: 'rejected_by_gs',
        leaveId: req.params.leaveId,
        reason
      })

      res.json({ message: 'Leave rejected by GS' })
    } catch (err) {
      console.error('GS reject leave error:', err)
      res.status(500).json({ message: 'Failed to reject leave' })
    }
  }
)

app.put(
  '/api/gs/review-report/:reportId',
  authenticateToken,
  authorizeRole('gs', 'admin'),
  async (req, res) => {
    try {
      const report = await WorkReport.findById(req.params.reportId)
      if (!report) {
        return res.status(404).json({ message: 'Report not found' })
      }

      const updated = await WorkReport.updateStatus(
        req.params.reportId,
        'gs_reviewed',
        req.user.userId
      )

      const reportAuthor = await UserProfile.findByCouncilId(
        (await User.findById(report.user_id)).council_id
      )

      await createSystemLog(
        pool,
        req.user.userId,
        req.user.role,
        'GS_REVIEW',
        'REPORT',
        report.id,
        `GS reviewed report: "${report.title}" by ${reportAuthor?.name || 'Unknown'} from ${reportAuthor?.committee_name || 'No Committee'}`,
        'INFO'
      )

      res.json({ message: 'Report reviewed', report: updated })
    } catch (err) {
      console.error('GS review report error:', err)
      res.status(500).json({ message: 'Failed to review report' })
    }
  }
)

// ============================================
// UTILITY FUNCTIONS & REMAINING ROUTES
// ============================================

async function calculateAttendanceRate(userIds) {
  if (userIds.length === 0) return 0;
  
  const stats = await Attendance.getAttendanceStats(userIds, 7);
  const totalPossible = userIds.length * 7;
  const actualAttendance = stats.reduce((sum, stat) => sum + parseInt(stat.total_days), 0);
  
  return Math.round((actualAttendance / totalPossible) * 100);
}

const initDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findByCouncilId('Vicky+++');
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        council_id: 'Vicky+++',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// ============================================
// BULK CREATE PROFILES (continued)
// ============================================

app.post(
  '/api/admin/bulk-create-profiles',
  authenticateToken,
  authorizeRole('admin'),
  upload.single('csvFile'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file required' })
    }

    const created = []
    const updated = []
    const errors = []
    const rows = []

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        for (const row of rows) {
          try {
            const councilId = row['Council-id']?.trim()
            if (!councilId) continue

            let user = await User.findByCouncilId(councilId)

            if (!user) {
              user = await User.create({
                council_id: councilId,
                password: await bcrypt.hash('default123', 10),
                role: 'member'
              })

              await createSystemLog(pool, req.user.userId, req.user.role, 'CREATE', 'USER', user.id, `Auto-created user from bulk profile: ${councilId}`, 'INFO');
            }

            const profileData = {
              council_id: councilId,
              member_picture: row['Member Picture'] || null,
              name: row['Name'],
              enrollment_number: row['Enrollment Number'] || null,
              committee_name: row['Committee/Team name']?.trim(),
              position: row['Position'],
              phone_number: row['Phone number'],
              email_id: row['Email Id'],
              address: row['Address'],
              instagram: row['instagram'],
              discord: row['Discord'],
              linkedin: row['linkdin'],
              snapchat: row['Snapchat'],
              github: row['Github'],
            }

            const existingProfile =
              await UserProfile.findByCouncilId(councilId)

            if (existingProfile) {
              await UserProfile.updateByCouncilId(councilId, profileData)
              updated.push(councilId)

              await createSystemLog(pool, req.user.userId, req.user.role, 'UPDATE', 'PROFILE', existingProfile.id, `Bulk updated profile: ${councilId} (${row['Name']}) - Committee: ${row['Committee/Team name']}`, 'INFO');
            } else {
              const newProfile = await UserProfile.create(profileData)
              created.push(councilId)

              await createSystemLog(pool, req.user.userId, req.user.role, 'CREATE', 'PROFILE', newProfile.id, `Bulk created profile: ${councilId} (${row['Name']}) - Committee: ${row['Committee/Team name']} - Position: ${row['Position']}`, 'INFO');
            }
          } catch (err) {
            errors.push(err.message)
          }
        }

        fs.unlinkSync(req.file.path)

        await createSystemLog(pool, req.user.userId, req.user.role, 'BULK_CREATE', 'PROFILE', null, `Bulk profile operation: ${created.length} created, ${updated.length} updated (${errors.length} errors)`, 'INFO');

        res.json({
          created: created.length,
          updated: updated.length,
          total: rows.length,
          errors,
        })
      })
  }
)

// ============================================
// COMMITTEES ROUTES
// ============================================

app.get(
  '/api/committees',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT TRIM(committee_name) AS committee_name
        FROM user_profiles
        WHERE committee_name IS NOT NULL
          AND TRIM(committee_name) <> ''
        ORDER BY committee_name
      `)

      res.json(result.rows.map(r => r.committee_name))
    } catch (err) {
      console.error('Committee fetch error:', err)
      res.status(500).json({ message: 'Failed to load committees' })
    }
  }
)

// ============================================
// ATTENDANCE REPORTS
// ============================================

app.get(
  '/api/admin/attendance-report',
  authenticateToken,
  authorizeRole('admin', 'gs'),
  async (req, res) => {
    const { startDate, endDate, committee = 'all' } = req.query

    try {
      const { rows } = await pool.query(
        ATTENDANCE_REPORT_SQL,
        [startDate, endDate, committee]
      )

      if (!rows.length) {
        return res.json([])
      }

      const grouped = {}

      for (const r of rows) {
        if (!grouped[r.committee_name]) {
          grouped[r.committee_name] = {
            committee: r.committee_name,
            head: r.head_name || 'N/A',
            members: []
          }
        }

        grouped[r.committee_name].members.push({
          name: r.name,
          attendance: Number(r.attendance_days),
          totalHours: Number(r.total_hours),
          weeklyAvg: Number(r.weekly_avg),
          dailyAvg: Number(r.daily_avg)
        })
      }

      res.json(Object.values(grouped))
    } catch (err) {
      console.error('Attendance report error:', err)
      res.status(500).json({ message: 'Failed to generate report' })
    }
  }
)

const ATTENDANCE_REPORT_SQL = `
WITH attendance AS (
  SELECT
    up.committee_name,
    up.name,
    COUNT(DISTINCT DATE(al.punch_in)) AS attendance_days,
    COALESCE(
      SUM(
        EXTRACT(EPOCH FROM (al.punch_out - al.punch_in))
      ) / 3600,
      0
    ) AS total_hours
  FROM attendance_logs al
  JOIN users u ON u.id = al.user_id
  JOIN user_profiles up ON up.council_id = u.council_id
  WHERE
    al.punch_in::date BETWEEN $1 AND $2
    AND ($3 = 'all' OR up.committee_name = $3)
  GROUP BY up.committee_name, up.name
),
range_meta AS (
  SELECT
    GREATEST((($2::date - $1::date + 1) / 7.0), 1) AS weeks,
    GREATEST(($2::date - $1::date + 1), 1) AS days
),
heads AS (
  SELECT
    committee_name,
    name AS head_name
  FROM user_profiles
  WHERE LOWER(position) = 'head'
)
SELECT
  a.committee_name,
  h.head_name,
  a.name,
  a.attendance_days,
  ROUND(a.total_hours, 2) AS total_hours,
  ROUND(a.total_hours / rm.weeks, 2) AS weekly_avg,
  ROUND(a.total_hours / rm.days, 2) AS daily_avg
FROM attendance a
LEFT JOIN heads h ON h.committee_name = a.committee_name
CROSS JOIN range_meta rm
ORDER BY a.committee_name, a.name;
`

app.get(
  '/api/admin/attendance-report/pdf',
  authenticateToken,
  authorizeRole('admin', 'gs'),
  async (req, res) => {
    try {
      const { committee = 'all', startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Date range required' })
      }

      const params = [startDate, endDate]
      let committeeFilter = ''

      if (committee !== 'all') {
        params.push(committee)
        committeeFilter = `AND up.committee_name = $3`
      }

      const result = await pool.query(
        `
        SELECT
          up.committee_name,
          up.name,
          up.position,
          COUNT(DISTINCT DATE(al.punch_in)) AS attendance_days,
          ROUND(
            COALESCE(
              SUM(
                EXTRACT(EPOCH FROM (al.punch_out - al.punch_in))
              ) / 3600,
              0
            ),
            2
          ) AS total_hours
        FROM users u
        JOIN user_profiles up ON up.council_id = u.council_id
        LEFT JOIN attendance_logs al
          ON al.user_id = u.id
         AND al.punch_in::date BETWEEN $1 AND $2
        WHERE up.committee_name IS NOT NULL
        ${committeeFilter}
        GROUP BY up.committee_name, up.name, up.position
        ORDER BY up.committee_name, up.name
        `,
        params
      )

      const grouped = {}

      for (const row of result.rows) {
        if (!grouped[row.committee_name]) {
          grouped[row.committee_name] = {
            committee: row.committee_name,
            head: null,
            members: []
          }
        }

        if (
          row.position &&
          row.position.toLowerCase().includes('head')
        ) {
          grouped[row.committee_name].head = row.name
        }

        const days =
          Math.max(
            1,
            Math.ceil(
              (new Date(endDate) - new Date(startDate)) /
                (1000 * 60 * 60 * 24)
            )
          )

        grouped[row.committee_name].members.push({
          name: row.name,
          attendance: Number(row.attendance_days),
          totalHours: Number(row.total_hours),
          weeklyAvg: Number(
            (row.total_hours / (days / 7)).toFixed(2)
          ),
          dailyAvg: Number(
            (row.total_hours / days).toFixed(2)
          ),
        })
      }

      const reportData = Object.values(grouped)

      if (reportData.length === 0) {
        return res
          .status(404)
          .json({ message: 'No attendance data found' })
      }

      const generateAttendancePdf =
        require('./utils/generateAttendancePdf')

      generateAttendancePdf(res, reportData, {
        committee,
        startDate,
        endDate,
      })
    } catch (err) {
      console.error('Attendance PDF error:', err)
      res.status(500).json({ message: 'PDF export failed' })
    }
  }
)

// ============================================
// SYSTEM LOGS ROUTES
// ============================================

app.get(
  '/api/admin/logs',
  authenticateToken,
  authorizeRole('admin', 'gs'),
  async (req, res) => {
    try {
      const {
        type,
        user,
        action,
        startDate,
        endDate
      } = req.query

      const filters = []
      const values = []

      if (startDate) {
        values.push(startDate)
        filters.push(`log_time >= $${values.length}`)
      }

      if (endDate) {
        values.push(endDate)
        filters.push(`log_time <= $${values.length}`)
      }

      if (user) {
        values.push(`%${user}%`)
        filters.push(`council_id ILIKE $${values.length}`)
      }

      if (action) {
        values.push(`%${action}%`)
        filters.push(`action ILIKE $${values.length}`)
      }

      const whereClause =
        filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

      let sql = ''

      if (type === 'attendance') {
        sql = `
          SELECT
            al.id,
            u.council_id,
            CASE
              WHEN al.punch_out IS NULL THEN 'Punch In'
              ELSE 'Punch Out'
            END AS action,
            'Attendance recorded' AS description,
            COALESCE(al.punch_out, al.punch_in) AS log_time
          FROM attendance_logs al
          JOIN users u ON u.id = al.user_id
        `
      }

      else if (type === 'reports') {
        sql = `
          SELECT
            wr.id,
            u.council_id,
            wr.status AS action,
            wr.title AS description,
            wr.created_at AS log_time
          FROM work_reports wr
          JOIN users u ON u.id = wr.user_id
        `
      }

      else if (type === 'leaves') {
        sql = `
          SELECT
            la.id,
            u.council_id,
            CASE
              WHEN la.gs_approval THEN 'Approved'
              WHEN la.head_approval THEN 'Head Approved'
              ELSE 'Applied'
            END AS action,
            la.title AS description,
            la.created_at AS log_time
          FROM leave_applications la
          JOIN users u ON u.id = la.user_id
        `
      }

      else if (type === 'login') {
        sql = `
          SELECT
            ll.id,
            u.council_id,
            'Login' AS action,
            ll.ip_address AS description,
            ll.login_time AS log_time
          FROM login_logs ll
          JOIN users u ON u.id = ll.user_id
        `
      }

      else {
        sql = `
          SELECT
            sl.id,
            u.council_id,
            sl.action,
            sl.description,
            sl.created_at AS log_time
          FROM system_logs sl
          LEFT JOIN users u ON u.id = sl.actor_user_id
        `
      }

      const finalQuery = `
        ${sql}
        ${whereClause}
        ORDER BY log_time DESC
        LIMIT 500
      `

      const result = await pool.query(finalQuery, values)

      res.json(
        result.rows.map(r => ({
          id: r.id,
          user: r.council_id || 'SYSTEM',
          action: r.action,
          description: r.description,
          created_at: r.log_time
        }))
      )
    } catch (err) {
      console.error('Logs error:', err)
      res.status(500).json({ message: 'Failed to load logs' })
    }
  }
)

const generateLogsPdf = require('./utils/generateLogsPdf')

app.get(
  '/api/admin/logs/pdf',
  authenticateToken,
  authorizeRole('admin', 'gs', 'committee_head'),
  async (req, res) => {
    try {
      const {
        type = 'system',
        user,
        action,
        severity,
        startDate,
        endDate
      } = req.query

      const filters = []
      const values = []

      const role = req.user.role
      const councilId = req.user.councilId

      let committeeName = null
      if (role === 'committee_head') {
        const profile = await UserProfile.findByCouncilId(councilId)
        committeeName = profile?.committee_name
      }

      if (startDate) {
        values.push(startDate)
        filters.push(`log_time >= $${values.length}`)
      }

      if (endDate) {
        values.push(endDate)
        filters.push(`log_time <= $${values.length}`)
      }

      if (user) {
        values.push(`%${user}%`)
        filters.push(`council_id ILIKE $${values.length}`)
      }

      if (action) {
        values.push(`%${action}%`)
        filters.push(`action ILIKE $${values.length}`)
      }

      if (severity) {
        values.push(severity)
        filters.push(`severity = $${values.length}`)
      }

      let sql = ''

      if (type === 'attendance') {
        sql = `
          SELECT
            al.id,
            u.council_id,
            CASE
              WHEN al.punch_out IS NULL THEN 'Punch In'
              ELSE 'Punch Out'
            END AS action,
            'Attendance recorded' AS description,
            'INFO' AS severity,
            COALESCE(al.punch_out, al.punch_in) AS log_time,
            up.committee_name
          FROM attendance_logs al
          JOIN users u ON u.id = al.user_id
          JOIN user_profiles up ON up.council_id = u.council_id
        `
      } else if (type === 'reports') {
        sql = `
          SELECT
            wr.id,
            u.council_id,
            wr.status AS action,
            wr.title AS description,
            'INFO' AS severity,
            wr.created_at AS log_time,
            up.committee_name
          FROM work_reports wr
          JOIN users u ON u.id = wr.user_id
          JOIN user_profiles up ON up.council_id = u.council_id
        `
      } else if (type === 'leaves') {
        sql = `
          SELECT
            la.id,
            u.council_id,
            CASE
              WHEN la.gs_approval THEN 'GS Approved'
              WHEN la.head_approval THEN 'Head Approved'
              ELSE 'Applied'
            END AS action,
            la.title AS description,
            CASE
              WHEN la.gs_approval THEN 'INFO'
              WHEN la.head_approval THEN 'WARNING'
              ELSE 'INFO'
            END AS severity,
            la.created_at AS log_time,
            up.committee_name
          FROM leave_applications la
          JOIN users u ON u.id = la.user_id
          JOIN user_profiles up ON up.council_id = u.council_id
        `
      } else if (type === 'login') {
        sql = `
          SELECT
            ll.id,
            u.council_id,
            'Login' AS action,
            ll.ip_address AS description,
            'INFO' AS severity,
            ll.login_time AS log_time,
            up.committee_name
          FROM login_logs ll
          JOIN users u ON u.id = ll.user_id
          JOIN user_profiles up ON up.council_id = u.council_id
        `
      } else {
        sql = `
          SELECT
            sl.id,
            u.council_id,
            sl.action,
            sl.description,
            sl.severity,
            sl.created_at AS log_time,
            NULL AS committee_name
          FROM system_logs sl
          LEFT JOIN users u ON u.id = sl.actor_user_id
        `
      }

      if (role === 'committee_head' && committeeName) {
        values.push(committeeName)
        filters.push(`committee_name = $${values.length}`)
      }

      const whereClause =
        filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

      const finalQuery = `
        ${sql}
        ${whereClause}
        ORDER BY log_time DESC
        LIMIT 1000
      `

      const result = await pool.query(finalQuery, values)

      generateLogsPdf(res, {
        title: `${type.toUpperCase()} Logs Report`,
        filters: {
          type,
          user,
          action,
          severity,
          startDate,
          endDate
        },
        logs: result.rows.map(r => ({
          user: r.council_id || 'SYSTEM',
          action: r.action,
          description: r.description,
          severity: r.severity,
          committee: r.committee_name,
          created_at: r.log_time
        }))
      })
    } catch (err) {
      console.error('Logs PDF error:', err)
      res.status(500).json({ message: 'Failed to export logs PDF' })
    }
  }
)
// ============================================
//QR ROUTES
// ============================================
async function getAttendanceSettings() {
  const res = await pool.query(`SELECT * FROM attendance_settings WHERE id=1`);
  if (res.rows.length === 0) {
    await pool.query(`INSERT INTO attendance_settings (id) VALUES (1)`);
    const r = await pool.query(`SELECT * FROM attendance_settings WHERE id=1`);
    return r.rows[0];
  }
  return res.rows[0];
}
const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || "qr-secret-change-me";
async function updateAttendanceSettings(payload, adminId) {
  const {
    qr_enabled,
    qr_expiry_seconds,
    time_window_enabled,
    start_time,
    end_time,
    punchout_min_minutes,
  } = payload;

  const res = await pool.query(
    `
    UPDATE attendance_settings SET
      qr_enabled = COALESCE($1, qr_enabled),
      qr_expiry_seconds = COALESCE($2, qr_expiry_seconds),
      time_window_enabled = COALESCE($3, time_window_enabled),
      start_time = COALESCE($4, start_time),
      end_time = COALESCE($5, end_time),
      punchout_min_minutes = COALESCE($6, punchout_min_minutes),
      updated_by = $7,
      updated_at = NOW()
    WHERE id=1
    RETURNING *;
    `,
    [
      qr_enabled,
      qr_expiry_seconds,
      time_window_enabled,
      start_time,
      end_time,
      punchout_min_minutes,
      adminId || null,
    ]
  );

  return res.rows[0];
}


function isWithinWindow(start, end) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  // normal window
  if (startMin <= endMin) return nowMin >= startMin && nowMin <= endMin;

  // overnight window (example 22:00 - 02:00)
  return nowMin >= startMin || nowMin <= endMin;
}


app.get("/api/admin/attendance/settings",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
  try {
    const settings = await getAttendanceSettings();
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/admin/attendance/settings",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
  try {
    const adminId = req.user?.id || req.admin?.id || req.user?.adminId;
    const updated = await updateAttendanceSettings(req.body, adminId);
    return res.json({ success: true, settings: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// app.get("/api/qr/generate", authenticateToken, async (req, res) => {
//   try {
//     const settings = await getAttendanceSettings();

//     if (!settings.qr_enabled) {
//       return res.status(403).json({ success: false, message: "QR attendance disabled by admin" });
//     }

//     const councilId = req.user?.councilId;
//     const userId = req.user?.userId;

//     if (!userId || !councilId) {
//       return res.status(400).json({ success: false, message: "Invalid session" });
//     }

//     const expirySeconds = Number(settings.qr_expiry_seconds || 15);

//     const payload = {
//       userId,
//       councilId,
//       role: req.user.role,
//       ts: Date.now(),
//     };

//     const token = jwt.sign(payload, process.env.QR_SECRET, { expiresIn: expirySeconds });

//     return res.json({
//       success: true,
//       qr: token,
//       expirySeconds,
//     });
//   } catch (err) {
//     console.error("QR generate error:", err);
//     return res.status(500).json({ success: false, message: "QR generation failed" });
//   }
// });

const crypto = require("crypto");

// ============================================
// ✅ B) USER QR GENERATE API (JWT SIGNED)
// ============================================
app.get("/api/attendance/qr", authenticateToken, async (req, res) => {
  try {
    const { userId, councilId, role } = req.user;

    const settings = await getAttendanceSettings();

    // 1) Global QR enabled check
    if (!settings.qr_enabled) {
      return res.status(403).json({
        success: false,
        blocked: true,
        message: "QR attendance is disabled by admin",
      });
    }

    // 2) Attendance window check
    if (settings.time_window_enabled) {
      const ok = isWithinWindow(settings.start_time, settings.end_time);
      if (!ok) {
        return res.status(403).json({
          success: false,
          blocked: true,
          message: `Attendance allowed only between ${settings.start_time} - ${settings.end_time}`,
        });
      }
    }

    // 3) User QR block check
    const userRes = await pool.query(
      `SELECT qr_blocked, qr_block_reason FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { qr_blocked, qr_block_reason } = userRes.rows[0];

    if (qr_blocked === true) {
      return res.status(403).json({
        success: false,
        blocked: true,
        message: qr_block_reason || "Your QR generation is blocked by admin",
      });
    }

    // 4) Build signed QR payload
    const expiresIn = Math.max(5, Number(settings.qr_expiry_seconds || 15));
    const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");

    const qrToken = jwt.sign(
      {
        typ: "ATTENDANCE_QR",
        uid: userId,
        cid: councilId,
        role: role,
        jti,
      },
      QR_SECRET,
      { expiresIn: expiresIn } // seconds
    );

    return res.json({
      success: true,
      qr: qrToken,
      expiresIn,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ /api/attendance/qr error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate QR",
      error: err.message,
    });
  }
});
// ============================================

// ============================================
// ✅ C) ELECTRON KIOSK QR SCAN API (PUBLIC)
// - verifies QR token
// - anti-replay (jti unique)
// - punch-in/punch-out with min rule
// ============================================
app.post("/api/attendance/kiosk/scan-qr", async (req, res) => {
  try {
    const { qr, kioskDeviceId } = req.body

    if (!qr) {
      return res.status(400).json({ success: false, message: "QR token required" })
    }

    // ✅ Verify token
    let payload
    try {
      payload = jwt.verify(qr, QR_SECRET)
    } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid or expired QR" })
    }

    if (payload?.typ !== "ATTENDANCE_QR") {
      return res.status(401).json({ success: false, message: "Invalid QR type" })
    }

    const userId = payload.uid
    const councilId = payload.cid
    const jti = payload.jti

    if (!userId || !councilId || !jti) {
      return res.status(400).json({ success: false, message: "QR payload corrupted" })
    }

    // ✅ Settings
    const settings = await getAttendanceSettings()

    if (!settings.qr_enabled) {
      return res.status(403).json({ success: false, message: "QR attendance disabled by admin" })
    }

    if (settings.time_window_enabled) {
      const ok = isWithinWindow(settings.start_time, settings.end_time)
      if (!ok) {
        return res.status(403).json({
          success: false,
          message: `Attendance allowed only between ${settings.start_time} - ${settings.end_time}`,
        })
      }
    }

    // ✅ Anti replay
    try {
      await pool.query(
        `
        INSERT INTO qr_scan_events (jti, user_id, council_id, kiosk_device_id, result)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [jti, userId, councilId, kioskDeviceId || null, "RECEIVED"]
      )
    } catch (e) {
      return res.status(409).json({
        success: false,
        message: "QR already scanned (refresh QR and try again)",
      })
    }

    // ✅ User check
    const userRes = await pool.query(
      `
      SELECT u.id, u.council_id, u.qr_blocked, u.qr_block_reason,
             up.name, up.committee_name
      FROM users u
      LEFT JOIN user_profiles up ON up.council_id = u.council_id
      WHERE u.id=$1 AND u.council_id=$2
      LIMIT 1
      `,
      [userId, councilId]
    )

    if (userRes.rows.length === 0) {
      await pool.query(`UPDATE qr_scan_events SET result='USER_NOT_FOUND' WHERE jti=$1`, [jti])
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const user = userRes.rows[0]

    if (user.qr_blocked === true) {
      await pool.query(`UPDATE qr_scan_events SET result='USER_BLOCKED' WHERE jti=$1`, [jti])
      return res.status(403).json({
        success: false,
        message: user.qr_block_reason || "User QR is blocked by admin",
      })
    }

    const minPunchout = Math.max(1, Number(settings.punchout_min_minutes || 30))

    // ✅ Check active record
    const activeRes = await pool.query(
      `
      SELECT 
        id,
        punch_in,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - punch_in)) / 60) AS duration_minutes
      FROM attendance_logs
      WHERE user_id = $1
        AND DATE(punch_in) = CURRENT_DATE
        AND status = 'punched_in'
      ORDER BY punch_in DESC
      LIMIT 1
      `,
      [userId]
    )

    // ✅ PUNCH IN
    if (activeRes.rows.length === 0) {
      const inserted = await pool.query(
        `
        INSERT INTO attendance_logs (user_id, punch_in, status, biometric_verified, biometric_quality)
        VALUES ($1, NOW(), 'punched_in', true, 100)
        RETURNING *
        `,
        [userId]
      )

      await pool.query(`UPDATE qr_scan_events SET result='PUNCH_IN' WHERE jti=$1`, [jti])

      emitAttendanceUpdate({
        type: "punch_in",
        userId,
        councilId,
        name: user.name || "Unknown",
        committee: user.committee_name || "",
        timestamp: new Date().toISOString(),
      })

      return res.json({
        success: true,
        action: "punch_in",
        message: "✅ Punch-in recorded",
        member: {
          userId,
          council_id: councilId,
          name: user.name || "Unknown",
          committee: user.committee_name || "",
          punch_in: inserted.rows[0].punch_in,
        },
      })
    }

    // ✅ PUNCH OUT
    const active = activeRes.rows[0]
    const durationMinutes = Number(active.duration_minutes || 0)

    if (durationMinutes < minPunchout) {
      await pool.query(`UPDATE qr_scan_events SET result='PUNCHOUT_BLOCKED' WHERE jti=$1`, [jti])

      return res.status(400).json({
        success: false,
        action: "blocked",
        message: `Need to work ${minPunchout} minutes. Current: ${durationMinutes}`,
        remaining_minutes: minPunchout - durationMinutes,
        member: {
          userId,
          council_id: councilId,
          name: user.name || "Unknown",
          committee: user.committee_name || "",
          punch_in: active.punch_in,
        },
      })
    }

    const updated = await pool.query(
      `
      UPDATE attendance_logs
      SET punch_out = NOW(),
          status = 'completed',
          biometric_verified = true,
          biometric_quality = 100
      WHERE id = $1
      RETURNING *
      `,
      [active.id]
    )

    await pool.query(`UPDATE qr_scan_events SET result='PUNCH_OUT' WHERE jti=$1`, [jti])

    emitAttendanceUpdate({
      type: "punch_out",
      userId,
      councilId,
      name: user.name || "Unknown",
      committee: user.committee_name || "",
      timestamp: new Date().toISOString(),
    })

    return res.json({
      success: true,
      action: "punch_out",
      message: "✅ Punch-out recorded",
      duration_minutes: durationMinutes,
      member: {
        userId,
        council_id: councilId,
        name: user.name || "Unknown",
        committee: user.committee_name || "",
        punch_in: updated.rows[0].punch_in,
        punch_out: updated.rows[0].punch_out,
      },
    })
  } catch (err) {
    console.error("❌ /api/attendance/kiosk/scan-qr error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Failed to scan QR",
      error: err.message,
    })
  }
})

// app.post("/api/attendance/kiosk/scan-qr", async (req, res) => {
//   try {
//     const { qr, kioskDeviceId } = req.body;

//     if (!qr) {
//       return res.status(400).json({
//         success: false,
//         message: "QR token required",
//       });
//     }

//     // 1) verify token
//     let payload;
//     try {
//       payload = jwt.verify(qr, QR_SECRET);
//     } catch (e) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid or expired QR",
//       });
//     }

//     // Must be our attendance qr
//     if (payload?.typ !== "ATTENDANCE_QR") {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid QR type",
//       });
//     }

//     const userId = payload.uid;
//     const councilId = payload.cid;
//     const jti = payload.jti;

//     if (!userId || !councilId || !jti) {
//       return res.status(400).json({
//         success: false,
//         message: "QR payload corrupted",
//       });
//     }

//     // 2) Load admin settings
//     const settings = await getAttendanceSettings();

//     if (!settings.qr_enabled) {
//       return res.status(403).json({
//         success: false,
//         message: "QR attendance disabled by admin",
//       });
//     }

//     // 3) Attendance window check
//     if (settings.time_window_enabled) {
//       const ok = isWithinWindow(settings.start_time, settings.end_time);
//       if (!ok) {
//         return res.status(403).json({
//           success: false,
//           message: `Attendance allowed only between ${settings.start_time} - ${settings.end_time}`,
//         });
//       }
//     }

//     // 4) Anti replay check (same QR token cannot be scanned twice)
//     try {
//       await pool.query(
//         `
//         INSERT INTO qr_scan_events (jti, user_id, council_id, kiosk_device_id, result)
//         VALUES ($1, $2, $3, $4, $5)
//         `,
//         [jti, userId, councilId, kioskDeviceId || null, "RECEIVED"]
//       );
//     } catch (e) {
//       return res.status(409).json({
//         success: false,
//         message: "QR already scanned (refresh QR and try again)",
//       });
//     }

//     // 5) Check user exists + QR block flag
//     const userRes = await pool.query(
//       `
//       SELECT u.id, u.council_id, u.qr_blocked, u.qr_block_reason,
//              up.name, up.committee_name
//       FROM users u
//       LEFT JOIN user_profiles up ON up.council_id = u.council_id
//       WHERE u.id=$1 AND u.council_id=$2
//       LIMIT 1
//       `,
//       [userId, councilId]
//     );

//     if (userRes.rows.length === 0) {
//       await pool.query(`UPDATE qr_scan_events SET result='USER_NOT_FOUND' WHERE jti=$1`, [jti]);
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const user = userRes.rows[0];

//     if (user.qr_blocked === true) {
//       await pool.query(`UPDATE qr_scan_events SET result='USER_BLOCKED' WHERE jti=$1`, [jti]);
//       return res.status(403).json({
//         success: false,
//         message: user.qr_block_reason || "User QR is blocked by admin",
//       });
//     }

//     const minPunchout = Math.max(0, Number(settings.punchout_min_minutes || 30));

//     // 6) Check active punched_in record today
//  const activeRes = await pool.query(
//       `
//       SELECT id, punch_in
//       FROM attendance_logs
//       WHERE user_id=$1
//         AND DATE(punch_in) = CURRENT_DATE
//         AND status='punched_in'
//       ORDER BY punch_in DESC
//       LIMIT 1
//       `,
//       [userId]
//     )

//     // ✅ PUNCH IN FLOW
//     // If NO active punched_in record exists -> insert punch in
//     if (activeRes.rows.length === 0) {
//       // ✅ EXTRA PROTECTION: ensure user doesn't already have punched_in today
//       // (just in case some race condition happens)
//       const checkAgain = await pool.query(
//         `
//         SELECT id, punch_in
//         FROM attendance_logs
//         WHERE user_id=$1
//           AND DATE(punch_in) = CURRENT_DATE
//           AND status='punched_in'
//         ORDER BY punch_in DESC
//         LIMIT 1
//         `,
//         [userId]
//       )

//       if (checkAgain.rows.length > 0) {
//         await pool.query(
//           `UPDATE qr_scan_events SET result='ALREADY_PUNCHED_IN' WHERE jti=$1`,
//           [jti]
//         )

//         return res.status(400).json({
//           success: false,
//           action: "already_in",
//           message: "⚠️ Already punched in. Please wait before punching out.",
//           member: {
//             userId,
//             council_id: councilId,
//             name: user.name || "Unknown",
//             committee: user.committee_name || "",
//             punch_in: checkAgain.rows[0].punch_in,
//           },
//         })
//       }

//       const inserted = await pool.query(
//         `
//         INSERT INTO attendance_logs (user_id, punch_in, status, biometric_verified, biometric_quality)
//         VALUES ($1, NOW(), 'punched_in', true, 100)
//         RETURNING *
//         `,
//         [userId]
//       )

//       await pool.query(
//         `UPDATE qr_scan_events SET result='PUNCH_IN' WHERE jti=$1`,
//         [jti]
//       )

//       // 🔥 socket event
//       emitAttendanceUpdate({
//         type: "punch_in",
//         userId,
//         councilId,
//         name: user.name || "Unknown",
//         committee: user.committee_name || "",
//         timestamp: new Date().toISOString(),
//       })

//       return res.json({
//         success: true,
//         action: "punch_in",
//         message: "✅ Punch-in recorded",
//         member: {
//           userId,
//           council_id: councilId,
//           name: user.name || "Unknown",
//           committee: user.committee_name || "",
//           punch_in: inserted.rows[0].punch_in,
//         },
//       })
//     }
//     // ✅ PUNCH OUT FLOW
//     const active = activeRes.rows[0];
//     const punchInTime = new Date(active.punch_in);
//     const now = new Date();
//     const durationMinutes = Math.floor((now - punchInTime) / 60000);

//     if (durationMinutes < minPunchout) {
//       await pool.query(`UPDATE qr_scan_events SET result='PUNCHOUT_BLOCKED' WHERE jti=$1`, [jti]);
//       return res.status(400).json({
//         success: false,
//         action: "blocked",
//         message: `Need to work ${minPunchout} minutes. Current: ${durationMinutes}`,
//         remaining_minutes: minPunchout - durationMinutes,
//       });
//     }

//     const updated = await pool.query(
//       `
//       UPDATE attendance_logs
//       SET punch_out = NOW(),
//           status = 'completed',
//           biometric_verified = true,
//           biometric_quality = 100
//       WHERE id = $1
//       RETURNING *
//       `,
//       [active.id]
//     );

//     await pool.query(`UPDATE qr_scan_events SET result='PUNCH_OUT' WHERE jti=$1`, [jti]);

//     emitAttendanceUpdate({
//       type: "punch_out",
//       userId,
//       councilId,
//       name: user.name || "Unknown",
//       committee: user.committee_name || "",
//       timestamp: new Date().toISOString(),
//     });

//     return res.json({
//       success: true,
//       action: "punch_out",
//       message: "✅ Punch-out recorded",
//       duration_minutes: durationMinutes,
//       member: {
//         userId,
//         council_id: councilId,
//         name: user.name || "Unknown",
//         committee: user.committee_name || "",
//         punch_in: updated.rows[0].punch_in,
//         punch_out: updated.rows[0].punch_out,
//       },
//     });
//   } catch (err) {
//     console.error("❌ /api/attendance/kiosk/scan-qr error:", err.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to scan QR",
//       error: err.message,
//     });
//   }
// });
// ============================================
// ✅ D) ADMIN QR BLOCK/UNBLOCK USER
// ============================================
app.put(
  "/api/admin/users/:userId/qr-block",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { blocked, reason } = req.body;

      const value = blocked === true;

      const result = await pool.query(
        `
        UPDATE users
        SET qr_blocked = $1,
            qr_block_reason = $2,
            qr_blocked_at = CASE WHEN $1=true THEN NOW() ELSE NULL END
        WHERE id = $3
        RETURNING id, council_id, qr_blocked, qr_block_reason, qr_blocked_at
        `,
        [value, reason || null, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const row = result.rows[0];

      // ✅ log
      await createSystemLog(
        pool,
        req.user.userId,
        req.user.role,
        value ? "QR_BLOCK" : "QR_UNBLOCK",
        "USER",
        row.id,
        `${value ? "Blocked" : "Unblocked"} QR for councilId=${row.council_id} ${
          reason ? `Reason: ${reason}` : ""
        }`,
        value ? "WARNING" : "INFO"
      );

      return res.json({
        success: true,
        message: value ? "✅ User QR blocked" : "✅ User QR unblocked",
        user: row,
      });
    } catch (err) {
      console.error("❌ /api/admin/users/:userId/qr-block error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to update user QR block",
        error: err.message,
      });
    }
  }
);
// ============================================
// ✅ ADMIN: LIST USERS WITH QR STATUS
// ============================================
app.get(
  "/api/admin/users/qr-status",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          u.id AS user_id,
          u.council_id,
          u.role,
          u.qr_blocked,
          u.qr_block_reason,
          u.qr_blocked_at,
          up.name,
          up.committee_name
        FROM users u
        LEFT JOIN user_profiles up ON up.council_id = u.council_id
        WHERE u.is_active = true
        ORDER BY up.name ASC NULLS LAST
      `);

      return res.json({
        success: true,
        count: result.rows.length,
        users: result.rows,
      });
    } catch (err) {
      console.error("❌ /api/admin/users/qr-status error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load QR status list",
        error: err.message,
      });
    }
  }
);



// ============================================
// 2. PUBLIC KIOSK PUNCH-IN (No auth required)
// ============================================
// app.post("/api/attendance/kiosk/punch-in", async (req, res) => {
//   try {
//     const { councilId, score } = req.body;

//     if (!councilId) {
//       return res.status(400).json({ success: false, message: "councilId required" });
//     }

//     // ✅ DIRECT USER LOOKUP
//     const userRes = await pool.query(`
//       SELECT 
//         u.id AS user_id,
//         u.council_id,
//         up.name,
//         up.committee_name
//       FROM users u
//       LEFT JOIN user_profiles up ON up.council_id = u.council_id
//       WHERE u.council_id = $1
//       LIMIT 1
//     `, [councilId]);

//     if (userRes.rows.length === 0) {
//       return res.status(401).json({ success: false, message: "User not found" });
//     }

//     const matchedUser = {
//       userId: userRes.rows[0].user_id,
//       councilId: userRes.rows[0].council_id,
//       name: userRes.rows[0].name || "Unknown",
//       committee: userRes.rows[0].committee_name || "",
//       matchScore: score || 0,
//     };

//     // ✅ CHECK ALREADY IN
//     const existing = await pool.query(`
//       SELECT id, punch_in
//       FROM attendance_logs
//       WHERE user_id = $1
//         AND DATE(punch_in) = CURRENT_DATE
//         AND status = 'punched_in'
//       LIMIT 1
//     `, [matchedUser.userId]);

//     if (existing.rows.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Already punched in. Please punch out first.",
//         existing_punch_in: existing.rows[0].punch_in
//       });
//     }

//     // ✅ INSERT NEW PUNCH-IN
//     const inserted = await pool.query(`
//       INSERT INTO attendance_logs (user_id, punch_in, status, biometric_verified, biometric_quality)
//       VALUES ($1, NOW(), 'punched_in', true, $2)
//       RETURNING *
//     `, [matchedUser.userId, matchedUser.matchScore]);

//     const attendance = inserted.rows[0];

//     return res.json({
//       success: true,
//       message: "Punch-in recorded",
//       member: {
//         userId: matchedUser.userId,
//         council_id: matchedUser.councilId,
//         name: matchedUser.name,
//         committee: matchedUser.committee,
//         punch_in: attendance.punch_in
//       }
//     });
//   } catch (err) {
//     console.error("kiosk punch-in error:", err);
//     return res.status(500).json({ success: false, message: "Failed punch-in" });
//   }
// });



// // ============================================
// // 3. PUBLIC KIOSK PUNCH-OUT (No auth required)
// // ✅ UPDATED: councilId based (NEW FLOW)
// // ============================================
// app.post("/api/attendance/kiosk/punch-out", async (req, res) => {
//   try {
//     const { councilId, score } = req.body;

//     if (!councilId) {
//       return res.status(400).json({ success: false, message: "councilId required" });
//     }

//     // ✅ DIRECT USER LOOKUP
//     const userRes = await pool.query(`
//       SELECT 
//         u.id AS user_id,
//         u.council_id,
//         up.name,
//         up.committee_name
//       FROM users u
//       LEFT JOIN user_profiles up ON up.council_id = u.council_id
//       WHERE u.council_id = $1
//       LIMIT 1
//     `, [councilId]);

//     if (userRes.rows.length === 0) {
//       return res.status(401).json({ success: false, message: "User not found" });
//     }

//     const userId = userRes.rows[0].user_id;
//     const name = userRes.rows[0].name || "Unknown";
//     const committee = userRes.rows[0].committee_name || "";

//     // ✅ FIND ACTIVE PUNCH-IN
//     const active = await pool.query(`
//       SELECT id, punch_in
//       FROM attendance_logs
//       WHERE user_id = $1
//         AND DATE(punch_in) = CURRENT_DATE
//         AND status = 'punched_in'
//       LIMIT 1
//     `, [userId]);

//     if (active.rows.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No active punch-in found"
//       });
//     }

//     const punchInTime = new Date(active.rows[0].punch_in);
//     const now = new Date();
//     const durationMinutes = Math.floor((now - punchInTime) / 60000);

//     if (durationMinutes < 30) {
//       return res.status(400).json({
//         success: false,
//         message: `Need to work 30 minutes. Current: ${durationMinutes}`,
//         remaining_minutes: 30 - durationMinutes
//       });
//     }

//     // ✅ UPDATE TO COMPLETED
//     const updated = await pool.query(`
//       UPDATE attendance_logs
//       SET punch_out = NOW(), status = 'completed',
//           biometric_verified = true,
//           biometric_quality = $2
//       WHERE id = $1
//       RETURNING *
//     `, [active.rows[0].id, score || 0]);

//     const attendance = updated.rows[0];

//     return res.json({
//       success: true,
//       message: "Punch-out recorded",
//       duration_minutes: durationMinutes,
//       member: {
//         userId,
//         council_id: councilId,
//         name,
//         committee,
//         punch_in: attendance.punch_in,
//         punch_out: attendance.punch_out
//       }
//     });
//   } catch (err) {
//     console.error("kiosk punch-out error:", err);
//     return res.status(500).json({ success: false, message: "Failed punch-out" });
//   }
// });


// ============================================
// 4. BIOMETRIC DETAILED MATCHING
// ============================================ 


// ✅ Save folder for templates
const ANSI_DIR = path.join(os.homedir(), ".council-attendance", "templates");
if (!fs.existsSync(ANSI_DIR)) fs.mkdirSync(ANSI_DIR, { recursive: true });

app.post("/api/biometric/enroll-save", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const { user_id, council_id, name, committee_name, ansi_base64 } = req.body;

    if (!user_id || !council_id || !ansi_base64) {
      return res.status(400).json({
        success: false,
        error: "user_id, council_id, ansi_base64 required",
      });
    }

    const ansiBuffer = Buffer.from(ansi_base64, "base64");
    if (ansiBuffer.length < 50) {
      return res.status(400).json({
        success: false,
        error: "Invalid ANSI template data",
      });
    }

    const safeCouncilId = String(council_id).replace(/[^\w-]/g, "_");
    const safeUserId = String(user_id).replace(/[^\w-]/g, "_");

    const fileName = `${safeCouncilId}_${safeUserId}_${Date.now()}.ansi`;
    const filePath = path.join(ANSI_DIR, fileName);

    fs.writeFileSync(filePath, ansiBuffer);

    // ✅ POSTGRES QUERY ✅
    const result = await pool.query(
      `
      INSERT INTO biometric_enrollments
        (user_id, council_id, name, committee_name, ansi_path, created_at)
      VALUES
        ($1, $2, $3, $4, $5, NOW())
      RETURNING id, ansi_path
      `,
      [user_id, council_id, name || "", committee_name || "", filePath]
    );

    return res.json({
      success: true,
      message: "✅ ANSI saved",
      insertedId: result.rows[0].id,
      ansi_path: result.rows[0].ansi_path,
    });
  } catch (err) {
    console.error("❌ /api/biometric/enroll-save error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


app.get("/api/biometric/enrolled", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        user_id,
        council_id,
        name,
        committee_name,
        ansi_path,
        created_at
      FROM biometric_enrollments
      WHERE ansi_path IS NOT NULL
      ORDER BY id DESC
    `);

    const rows = result.rows || [];

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("❌ /api/biometric/enrolled error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ============================================
// 5. TODAY'S LIVE ATTENDANCE
// ============================================
app.get("/api/attendance/today/live", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        al.id,
        u.council_id,
        up.name,
        up.committee_name AS committee,
        al.status,
        al.punch_in,
        al.punch_out,
        EXTRACT(EPOCH FROM (COALESCE(al.punch_out, NOW()) - al.punch_in))/60 AS duration_minutes,
        al.biometric_quality
      FROM attendance_logs al
      JOIN users u ON u.id = al.user_id
      LEFT JOIN user_profiles up ON up.council_id = u.council_id
      WHERE DATE(al.punch_in) = CURRENT_DATE
      ORDER BY al.punch_in DESC
    `)

    return res.json({
      success: true,
      records: result.rows,
    })
  } catch (err) {
    console.error("today live error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch live records" })
  }
})



// ============================================
// 6. VALIDATE PUNCH-OUT (30-min rule)
// ============================================
app.post('/api/attendance/validate/punch-out', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId required",
      });
    }

    // ✅ Check if user has active biometric enrolled
    const bioResult = await pool.query(`
      SELECT id, user_id
      FROM biometric_registrations
      WHERE user_id = $1 AND is_active = true
      LIMIT 1
    `, [userId]);

    if (bioResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User is not biometric enrolled",
      });
    }

    // ✅ Find today's punched_in record
    const checkResult = await pool.query(`
      SELECT id, punch_in
      FROM attendance_logs
      WHERE user_id = $1
        AND DATE(punch_in) = CURRENT_DATE
        AND status = 'punched_in'
      LIMIT 1
    `, [userId]);

    if (checkResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active punch-in found",
        valid: false,
      });
    }

    const punchInTime = new Date(checkResult.rows[0].punch_in);
    const now = new Date();
    const durationMinutes = Math.floor((now - punchInTime) / (1000 * 60));

    // ✅ 30 min rule
    if (durationMinutes < 30) {
      return res.json({
        success: true,
        valid: false,
        duration_minutes: durationMinutes,
        remaining_minutes: 30 - durationMinutes,
        message: `Need to work ${30 - durationMinutes} more minutes`,
      });
    }

    return res.json({
      success: true,
      valid: true,
      duration_minutes: durationMinutes,
      message: "Ready to punch out",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Punch-out validation error:", error);
    res.status(500).json({
      success: false,
      message: "Validation failed",
      error: error.message,
    });
  }
});


app.post('/api/attendance/kiosk/check-status', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId required"
      });
    }

    // ✅ Get basic user + profile info
    const userRes = await pool.query(`
      SELECT 
        u.id,
        u.council_id,
        up.name,
        up.committee_name
      FROM users u
      LEFT JOIN user_profiles up ON up.council_id = u.council_id
      WHERE u.id = $1
      LIMIT 1
    `, [userId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const member = userRes.rows[0];

    // ✅ check today latest record
    const check = await pool.query(`
      SELECT id, status, punch_in, punch_out
      FROM attendance_logs
      WHERE user_id = $1
        AND DATE(punch_in) = CURRENT_DATE
      ORDER BY punch_in DESC
      LIMIT 1
    `, [userId]);

    if (check.rows.length === 0) {
      return res.json({
        success: true,
        status: "not_punched",
        member: {
          userId: member.id,
          councilId: member.council_id,
          name: member.name || "Unknown",
          committee: member.committee_name || "-"
        }
      });
    }

    const record = check.rows[0];

    return res.json({
      success: true,
      status: record.status === "punched_in" ? "punched_in" : "completed",
      member: {
        userId: member.id,
        councilId: member.council_id,
        name: member.name || "Unknown",
        committee: member.committee_name || "-"
      },
      attendance: record
    });

  } catch (err) {
    console.error("check-status error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ============================================
// 8. CHECK IF USER IS ENROLLED
// ============================================
app.get('/api/biometrics/check/:councilId', async (req, res) => {
  try {
    const { councilId } = req.params;

    if (!councilId) {
      return res.status(400).json({ 
        success: false,
        message: 'Council ID required' 
      });
    }

    const result = await pool.query(`
      SELECT 
        id,
        council_id,
        is_active,
        registered_at,
        updated_at
      FROM biometric_registrations
      WHERE council_id = $1
    `, [councilId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        enrolled: false,
        council_id: councilId,
        message: 'User not enrolled'
      });
    }

    const bio = result.rows[0];

    res.json({
      success: true,
      enrolled: true,
      council_id: bio.council_id,
      is_active: bio.is_active,
      registered_at: bio.registered_at,
      last_updated: bio.updated_at,
      ready_for_attendance: bio.is_active,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check enrollment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Check failed',
      error: error.message 
    });
  }
});

// ============================================
// 9. TODAY'S ATTENDANCE SUMMARY
// ============================================
app.get('/api/attendance/today/summary', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Get total members
    const totalResult = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE is_active = true
    `);
    const totalMembers = parseInt(totalResult.rows[0].count);

    // Get members punched in
    const presentResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count FROM attendance_logs
      WHERE DATE(punch_in) = CURRENT_DATE
        AND status = 'punched_in'
    `);
    const presentCount = parseInt(presentResult.rows[0].count);

    // Get members completed
    const completedResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count FROM attendance_logs
      WHERE DATE(punch_in) = CURRENT_DATE
        AND status = 'completed'
        AND punch_out IS NOT NULL
    `);
    const completedCount = parseInt(completedResult.rows[0].count);

    const absentCount = totalMembers - presentCount - completedCount;
    const attendanceRate = totalMembers > 0 
      ? Math.round(((presentCount + completedCount) / totalMembers) * 100) 
      : 0;

    res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      total_members: totalMembers,
      present_count: presentCount,
      completed_count: completedCount,
      absent_count: Math.max(0, absentCount),
      attendance_rate: attendanceRate,
      summary: {
        punched_in: presentCount,
        finished_work: completedCount,
        not_present: Math.max(0, absentCount)
      },
      last_update: new Date().toISOString()
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch summary',
      error: error.message 
    });
  }
});

// ============================================
// HELPER FUNCTION: Calculate Similarity Score
// ============================================
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  
  let matches = 0;
  for (let i = 0; i < Math.min(len1, len2); i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return Math.round((matches / maxLen) * 100);
}

// ============================================
// END OF NEW ENDPOINTS
// ============================================
app.post('/api/admin/mark-attendance', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { councilId, fingerprintTemplate } = req.body;

    if (!councilId || !fingerprintTemplate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify biometric
    const isValid = await BiometricRegistration.verify(councilId, fingerprintTemplate);
    
    if (!isValid) {
      await createSystemLog(
        pool,
        req.user.userId,
        req.user.role,
        'BIOMETRIC_FAILED',
        'ATTENDANCE',
        null,
        `Failed biometric verification for attendance: ${councilId}`,
        'WARNING'
      );
      return res.status(401).json({ message: 'Biometric verification failed' });
    }

    // Get user by council ID
    const user = await User.findByCouncilId(councilId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark attendance
    const attendance = await Attendance.punchIn(user.id);

    const profile = await UserProfile.findByCouncilId(user.council_id);

    await createSystemLog(
      pool,
      req.user.userId,
      req.user.role,
      'ADMIN_PUNCH_IN',
      'ATTENDANCE',
      attendance.id,
      `Admin marked attendance for ${profile?.name || 'Unknown'} (${profile?.committee_name || 'No Committee'})`,
      'INFO'
    );

    emitAttendanceUpdate({
      type: 'punch_in',
      userId: user.id,
      councilId: user.council_id,
      name: profile?.name || 'Unknown',
      committee: profile?.committee_name || null,
      attendance,
      timestamp: new Date().toISOString(),
    });

    res.json({ 
      message: 'Attendance marked successfully', 
      attendance,
      member: {
        name: profile?.name,
        committee: profile?.committee_name
      }
    });
  } catch (error) {
    console.error('Admin mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});
// Get all biometric registrations
app.get('/api/biometrics/all', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const biometrics = await BiometricRegistration.findAll();
    res.json(biometrics);
  } catch (error) {
    console.error('Get biometrics error:', error);
    res.status(500).json({ message: 'Failed to fetch biometrics' });
  }
});

// Register biometric for a member
app.post('/api/biometrics/register', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    console.log('\n🔍 ===== BIOMETRIC REGISTER REQUEST =====');
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    const { councilId, fingerprintTemplate, name } = req.body;

    // Validate input
    if (!councilId) {
      console.log('❌ Missing councilId');
      return res.status(400).json({ message: 'Missing councilId' });
    }
    if (!fingerprintTemplate) {
      console.log('❌ Missing fingerprintTemplate');
      return res.status(400).json({ message: 'Missing fingerprintTemplate' });
    }
    if (!name) {
      console.log('❌ Missing name');
      return res.status(400).json({ message: 'Missing name' });
    }

    console.log('✅ All fields present');
    console.log('Looking for user:', councilId);

    // Check if user exists
    const user = await User.findByCouncilId(councilId);
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('❌ User not found for council_id:', councilId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User exists:', user.council_id);

    // Check if already registered
    console.log('Checking for existing registration...');
    const existing = await BiometricRegistration.findByCouncilId(councilId);
    
    if (existing) {
      console.log('✅ Existing registration found, updating...');
      
      const updated = await BiometricRegistration.update(existing.id, fingerprintTemplate);
      
      await createSystemLog(
        pool,
        req.user.userId,
        req.user.role,
        'UPDATE',
        'BIOMETRIC',
        updated.id,
        `Updated biometric for: ${name} (${councilId})`,
        'INFO'
      );

      console.log('✅ Biometric updated successfully');
      return res.json({ 
        message: 'Biometric updated successfully', 
        biometric: updated 
      });
    }

    // Create new registration
    console.log('Creating new biometric registration...');
    const newBiometric = await BiometricRegistration.create(
      councilId,
      name,
      fingerprintTemplate
    );

    console.log('✅ New biometric created:', newBiometric);

    await createSystemLog(
      pool,
      req.user.userId,
      req.user.role,
      'CREATE',
      'BIOMETRIC',
      newBiometric.id,
      `Registered biometric for: ${name} (${councilId})`,
      'INFO'
    );

    console.log('✅ System log created');
    console.log('===== BIOMETRIC REGISTER SUCCESS =====\n');

    res.json({ 
      message: 'Biometric registered successfully', 
      biometric: newBiometric 
    });
  } catch (error) {
    console.error('\n❌ ===== BIOMETRIC REGISTER ERROR =====');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('===== END ERROR =====\n');
    
    res.status(500).json({ 
      message: 'Failed to register biometric',
      error: error.message 
    });
  }
});
// Get biometric count (for dashboard stats)
app.get('/api/admin/biometric-stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const count = await BiometricRegistration.countRegistered();
    res.json({ registered: count });
  } catch (error) {
    console.error('Biometric stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Get all members (for member search)
app.get('/api/admin/all-members', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id AS user_id, 
        u.council_id,
        up.name,
        up.committee_name,
        up.position
      FROM users u
      LEFT JOIN user_profiles up ON up.council_id = u.council_id
      WHERE u.is_active = true
      ORDER BY up.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ UNHANDLED SERVER ERROR:', err)

  const status = err.status || 500

  res.status(status).json({
    message: err.message || 'Internal server error',
    status
  })
})

module.exports = app;