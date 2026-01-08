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
        imgSrc: ["'self'", CLIENT_URL, "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true }, // 1 year HTTPS enforcement
  })
);

// CORS
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (auth endpoints)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth', authLimiter);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Routes

// Authentication Routes
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { councilId, password } = req.body;
    
    // Find user
    const user = await User.findByCouncilId(councilId);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, councilId: user.council_id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES || '24h' }
    );

    // Log login
    await LoginLog.create(user.id, req.ip, req.get('User-Agent'));

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
    
    // Check if user already exists
    const existingUser = await User.findByCouncilId(councilId);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      council_id: councilId,
      password: hashedPassword,
      role: role
    });
    
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
          
          results.push(newUser);
        } catch (err) {
          errors.push(`Error processing row: ${err.message}`);
        }
      })
      .on('end', () => {
        fs.unlinkSync(req.file.path); // Clean up uploaded file
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
    // 1️⃣ Total active users
    const totalUsersRes = await pool.query(
      `SELECT COUNT(*) FROM users WHERE is_active = true`
    )
    const totalUsers = parseInt(totalUsersRes.rows[0].count)

    // 2️⃣ Active today (login based)
    const activeTodayRes = await pool.query(`
      SELECT COUNT(DISTINCT user_id)
      FROM login_logs
      WHERE login_time::date = CURRENT_DATE
    `)
    const activeToday = parseInt(activeTodayRes.rows[0].count)

    // 3️⃣ Attendance per committee (today)
const attendanceCommitteeRes = await pool.query(`
  SELECT up.committee_name, COUNT(DISTINCT al.user_id) AS count
  FROM attendance_logs al
  JOIN users u ON u.id = al.user_id
  JOIN user_profiles up ON up.council_id = u.council_id
  WHERE al.punch_in::date = CURRENT_DATE
  GROUP BY up.committee_name
`);

    const committeeStats = {}
    attendanceCommitteeRes.rows.forEach(row => {
      committeeStats[row.committee_name] = parseInt(row.count)
    })

    // 4️⃣ Total committees
    const committeesRes = await pool.query(`
      SELECT COUNT(DISTINCT committee_name) FROM user_profiles
    `)
    const totalCommittees = parseInt(committeesRes.rows[0].count)

    // 5️⃣ Attendance rate (overall)
    const attendanceRate =
      totalUsers === 0 ? 0 : Math.round((activeToday / totalUsers) * 100)

    // 6️⃣ Daily attendance trend (last 7 days)
    const trendRes = await pool.query(`
      SELECT DATE(punch_in) AS day, COUNT(DISTINCT user_id) AS count
      FROM attendance_logs
      GROUP BY day
      ORDER BY day DESC
      LIMIT 7
    `)

    // 7️⃣ Recent activity (first 10)
const activityRes = await pool.query(`
  SELECT 'login' AS type, ll.login_time AS time, up.name, up.committee_name
  FROM login_logs ll
  JOIN users u ON u.id = ll.user_id
  JOIN user_profiles up ON up.council_id = u.council_id

  UNION ALL

  SELECT 'attendance', al.created_at, up.name, up.committee_name
  FROM attendance_logs al
  JOIN users u ON u.id = al.user_id
  JOIN user_profiles up ON up.council_id = u.council_id

  UNION ALL

  SELECT 'report', r.created_at, up.name, up.committee_name
  FROM work_reports r
  JOIN users u ON u.id = r.user_id
  JOIN user_profiles up ON up.council_id = u.council_id

  UNION ALL

  SELECT 'leave', l.created_at, up.name, up.committee_name
  FROM leave_applications l
  JOIN users u ON u.id = l.user_id
  JOIN user_profiles up ON up.council_id = u.council_id

  ORDER BY time DESC
  LIMIT 10
`);


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
      dailyTrend: trendRes.rows.reverse(),
      recentActivity
    })
  } catch (error) {
    console.error('User stats error:', error)
    res.status(500).json({ message: 'Server error' })
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
      member_picture: req.file
  ? `/uploads/user-pfp/${req.file.filename}`
  : null,
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

      // 🔑 Determine councilId
      const councilId =
        req.user.role === 'admin'
          ? profileData.councilId
          : req.user.councilId;

      if (!councilId) {
        return res.status(400).json({ message: 'Council ID missing' });
      }

      // 🔍 Fetch existing profile
      const profile = await UserProfile.findByCouncilId(councilId);

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      /* ======================================
         🧹 DELETE OLD IMAGE (IF NEW UPLOADED)
      ====================================== */
      if (req.file && profile.member_picture) {
        const oldImagePath = path.join(
          __dirname,
          profile.member_picture.replace('/uploads', 'uploads')
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      /* ======================================
         📝 BUILD UPDATE DATA
      ====================================== */
      const updateData = {};

      // ❗ USER CAN UPDATE ONLY THESE
      if (req.user.role !== 'admin') {
        if (profileData.name) updateData.name = profileData.name;
        if (profileData.phoneNumber)
          updateData.phone_number = profileData.phoneNumber;
        if (profileData.emailId)
          updateData.email_id = profileData.emailId;
        if (profileData.address)
          updateData.address = profileData.address;
        if (profileData.instagram)
          updateData.instagram = profileData.instagram;
        if (profileData.discord)
          updateData.discord = profileData.discord;
        if (profileData.linkedin)
          updateData.linkedin = profileData.linkedin;
        if (profileData.snapchat)
          updateData.snapchat = profileData.snapchat;
        if (profileData.github)
          updateData.github = profileData.github;

        // 🖼️ New image
        if (req.file) {
          updateData.member_picture = `/uploads/user-pfp/${req.file.filename}`;
        }
      } 
      // ❗ ADMIN CAN UPDATE EVERYTHING
      else {
        Object.entries(profileData).forEach(([key, value]) => {
          if (value !== undefined) updateData[key] = value;
        });

        if (req.file) {
          updateData.member_picture = `/uploads/user-pfp/${req.file.filename}`;
        }
      }

      // 🚫 PROTECTED FIELDS (NEVER UPDATE)
      delete updateData.council_id;
      delete updateData.committee_name;
      delete updateData.position;

      /* ======================================
         💾 UPDATE DB
      ====================================== */
      const updatedProfile = await UserProfile.updateByCouncilId(
        councilId,
        updateData
      );

      /* ======================================
         🌐 FIX IMAGE URL FOR FRONTEND
      ====================================== */
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

      /* ===============================
         1️⃣ CREATE LEAVE
      =============================== */
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

      /* ===============================
         2️⃣ FETCH PROFILE (FIX)
      =============================== */
      const profile = await UserProfile.findByCouncilId(req.user.councilId)

      if (!profile || !profile.committee_name) {
        return res.status(400).json({
          message: 'Committee not assigned'
        })
      }

      /* ===============================
         3️⃣ EMIT SOCKET EVENT (FIXED)
      =============================== */
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
  const leave = await LeaveApplication.findById(req.params.id)

  if (!leave || leave.user_id !== req.user.userId) {
    return res.status(403).json({ message: 'Unauthorized' })
  }

  if (leave.gs_approval) {
    return res.status(400).json({ message: 'Cannot cancel approved leave' })
  }

  /* 🧹 delete file */
  if (leave.file_path) {
    const filePath = path.join(__dirname, leave.file_path)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }

  await LeaveApplication.delete(req.params.id)

  res.json({ message: 'Leave cancelled successfully' })
})



// Committee Head Routes
app.get(
  '/api/head/committee-insights',
  authenticateToken,
  authorizeRole('committee_head'),
  async (req, res) => {
    try {
      const range = req.query.range === 'monthly' ? 'monthly' : 'weekly'

      const headProfile = await UserProfile.findByCouncilId(req.user.councilId)
      if (!headProfile?.committee_name) {
        return res.status(404).json({ message: 'Committee not assigned' })
      }

      const committee = headProfile.committee_name

      /* ===========================
         DATE RANGE
      =========================== */
      const interval =
        range === 'monthly'
          ? "CURRENT_DATE - INTERVAL '30 days'"
          : "CURRENT_DATE - INTERVAL '7 days'"

      /* ===========================
         SUMMARY STATS
      =========================== */
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

      /* ===========================
         ATTENDANCE RATE
      =========================== */
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

      /* ===========================
         ATTENDANCE TREND (FOR CHART)
      =========================== */
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

      /* ===========================
         PENDING LEAVES
      =========================== */
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
  authorizeRole('committee_head'),
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
  authorizeRole('committee_head'),
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

app.put('/api/head/approve-leave/:leaveId',
  authenticateToken,
  authorizeRole('committee_head'),
  async (req, res) => {

    const updatedLeave = await LeaveApplication.updateHeadApproval(req.params.leaveId)

    emitLeaveUpdate({
      type: 'approved_by_head',
      leaveId: updatedLeave.id,
      userId: updatedLeave.user_id,
      timestamp: new Date().toISOString()
    })

    res.json({ message: 'Approved by head', leave: updatedLeave })
})

app.get(
  '/api/head/committee/leaves',
  authenticateToken,
  authorizeRole('committee_head'),
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

app.get(
  '/api/head/committee/leaves',
  authenticateToken,
  authorizeRole('committee_head'),
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
app.put(
  '/api/head/reject-leave/:leaveId',
  authenticateToken,
  authorizeRole('committee_head'),
  async (req, res) => {
    const { reason } = req.body
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason required' })
    }

    const leave = await LeaveApplication.findById(req.params.leaveId)
    if (!leave || leave.gs_approval) {
      return res.status(400).json({ message: 'Cannot reject this leave' })
    }

    await pool.query(`
      UPDATE leave_applications
      SET head_approval = false
      WHERE id = $1
    `, [req.params.leaveId])

    emitLeaveUpdate({
      type: 'rejected_by_head',
      leaveId: leave.id,
      reason
    })

    res.json({ message: 'Leave rejected' })
  }
)
app.get(
  '/api/head/committee/reports',
  authenticateToken,
  authorizeRole('committee_head'),
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
app.put(
  '/api/head/review-report/:reportId',
  authenticateToken,
  authorizeRole('committee_head'),
  async (req, res) => {
    const updated = await WorkReport.updateStatus(
      req.params.reportId,
      'reviewed',
      req.user.userId
    )

    res.json({
      message: 'Report reviewed',
      report: updated
    })
  }
)

app.get(
  '/api/head/notifications/count',
  authenticateToken,
  authorizeRole('committee_head'),
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

// GS Routes
app.get('/api/gs/all-committees-insights', authenticateToken, authorizeRole('gs'), async (req, res) => {
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

// Backwards-compatible alias for older clients that call /api/gs/dashboard/summary
// GS Routes - FIXED VERSION
app.get('/api/gs/dashboard/summary', authenticateToken, authorizeRole('gs'), async (req, res) => {
  try {
    // 1️⃣ Total committees
    const committeesRes = await pool.query(
      'SELECT COUNT(DISTINCT committee_name) FROM user_profiles WHERE committee_name IS NOT NULL'
    );
    const totalCommittees = parseInt(committeesRes.rows[0].count) || 0;

    // 2️⃣ Total members
    const membersRes = await pool.query(
      'SELECT COUNT(DISTINCT council_id) FROM user_profiles'
    );
    const totalMembers = parseInt(membersRes.rows[0].count) || 0;

    // 3️⃣ Today's attendance
    const attendanceRes = await pool.query(`
      SELECT COUNT(DISTINCT user_id) FROM attendance_logs
      WHERE punch_in::date = CURRENT_DATE
    `);
    const todayAttendance = parseInt(attendanceRes.rows[0].count) || 0;

    // 4️⃣ Pending leaves (GS approval)
    const pendingLeavesRes = await pool.query(`
      SELECT COUNT(*) FROM leave_applications
      WHERE gs_approval = false AND head_approval = true
    `);
    const pendingLeaves = parseInt(pendingLeavesRes.rows[0].count) || 0;

    // Return summary data
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

// Return list of distinct committees (used by GS filters)
app.get('/api/gs/committees', authenticateToken, authorizeRole('gs'), async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT committee_name FROM user_profiles WHERE committee_name IS NOT NULL');
    const committees = result.rows.map(r => r.committee_name).filter(Boolean);
    res.json(committees);
  } catch (err) {
    console.error('Error fetching committees:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET ATTENDANCE ANALYTICS BY COMMITTEE
app.get(
  '/api/gs/committee/attendance-analytics',
  authenticateToken,
  authorizeRole('gs', 'committee_head'),
  async (req, res) => {
    try {
      const { committee, startDate, endDate } = req.query

      // Debug logging
      console.log('📊 Attendance Analytics Request:', {
        userRole: req.user.role,
        committee,
        startDate,
        endDate
      })

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

      console.log('✅ Analytics returned:', result.rows.length, 'days')

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

// GET COMMITTEE MEMBERS WITH ATTENDANCE
app.get(
  '/api/gs/committee/members',
  authenticateToken,
  authorizeRole('gs', 'committee_head'),
  async (req, res) => {
    try {
      const { committee, startDate, endDate } = req.query

      // Debug logging
      console.log('👥 Committee Members Request:', {
        userRole: req.user.role,
        committee,
        startDate,
        endDate
      })

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

      console.log('✅ Members returned:', result.rows.length, 'members')

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

app.put('/api/gs/approve-leave/:leaveId',
  authenticateToken,
  authorizeRole('gs'),
  async (req, res) => {
    try {
      const updatedLeave = await LeaveApplication.updateGSApproval(req.params.leaveId)

      emitLeaveUpdate({
        type: 'approved',
        leaveId: updatedLeave.id,
        userId: updatedLeave.user_id,
        timestamp: new Date().toISOString()
      })

      res.json({ message: 'Approved by GS', leave: updatedLeave })
    } catch (err) {
      console.error('GS approve leave error:', err)
      res.status(500).json({ message: 'Failed to approve leave' })
    }
  }
)



// Utility functions
async function calculateAttendanceRate(userIds) {
  if (userIds.length === 0) return 0;
  
  const stats = await Attendance.getAttendanceStats(userIds, 7);
  const totalPossible = userIds.length * 7;
  const actualAttendance = stats.reduce((sum, stat) => sum + parseInt(stat.total_days), 0);
  
  return Math.round((actualAttendance / totalPossible) * 100);
}

// Initialize default admin user
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
            } else {
              await UserProfile.create(profileData)
              created.push(councilId)
            }
          } catch (err) {
            errors.push(err.message)
          }
        }

        fs.unlinkSync(req.file.path)

        res.json({
          created: created.length,
          updated: updated.length,
          total: rows.length,
          errors,
        })
      })
  }
)
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

app.get(
  '/api/admin/attendance-report',
  authenticateToken,
  authorizeRole('admin'),
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
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const { committee = 'all', startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Date range required' })
      }

      /* ============================
         SINGLE OPTIMIZED QUERY
      ============================ */
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

      /* ============================
         SHAPE DATA FOR PDF
      ============================ */
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

      /* ============================
         GENERATE PDF
      ============================ */
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
app.get(
  '/api/admin/logs',
  authenticateToken,
  authorizeRole('admin','gs'),
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

      /* ================= DATE FILTER ================= */
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

      /* ================= ATTENDANCE LOGS ================= */
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

      /* ================= REPORT LOGS ================= */
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

      /* ================= LEAVE LOGS ================= */
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

      /* ================= LOGIN LOGS ================= */
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

      /* ================= SYSTEM LOGS ================= */
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

      /* ================= DATE ================= */
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

      /* ================= SAME QUERIES AS /logs ================= */
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
// ================= GLOBAL ERROR HANDLER (FIX) =================
app.use((err, req, res, next) => {
  console.error('❌ UNHANDLED SERVER ERROR:', err)

  const status = err.status || 500

  res.status(status).json({
    message: err.message || 'Internal server error',
    status
  })
})



module.exports = app;