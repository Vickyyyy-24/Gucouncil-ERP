const fs = require('fs');
const path = require('path');
const db = require('./db');
const BiometricRegistration = require('./biometric'); 

// Initialize database
const initDB = async () => {
  let retries = 5;
  const retryDelay = 5000; // 5 seconds

  while (retries > 0) {
    try {
      // Test database connection first
      const connected = await db.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to database');
      }

      // Read and execute schema
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute the schema
      try {
        await db.query(schema);
      } catch (schemaErr) {
        console.error('Failed executing schema.sql. Dumping schema for debugging:\n', schema.substring(0, 2000));
        throw schemaErr;
      }
      console.log('Database schema initialized successfully');
      return;
    } catch (error) {
      retries--;
      if (error.code === 'ECONNREFUSED') {
        console.error('Database connection refused. Is PostgreSQL running?');
      } else if (error.code === 'ENOTFOUND') {
        console.error('Database host not found. Check your DATABASE_URL environment variable.');
      } else if (error.code === '28P01') {
        console.error('Invalid database credentials. Check your username and password.');
      } else if (error.code === '3D000') {
        console.error('Database does not exist. Please create it first.');
      } else {
        console.error('Database initialization error:', error.message);
      }
      
      if (retries > 0) {
        console.log(`Retrying in ${retryDelay/1000} seconds... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('Failed to initialize database after multiple attempts');
        throw error;
      }
    }
  }
};

// User Model
class User {
  static async create(userData) {
    try {
      const { council_id, password, role } = userData;
      const result = await db.query(
        'INSERT INTO users (council_id, password, role) VALUES ($1, $2, $3) RETURNING *',
        [council_id, password, role]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  static async findByCouncilId(council_id) {
    try {
      const result = await db.query('SELECT * FROM users WHERE council_id = $1', [council_id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in findByCouncilId:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          role,
          COUNT(*) FILTER (WHERE is_active = true) as active_users
        FROM users 
        GROUP BY role
      `);
      return result.rows;
    } catch (error) {
      console.error('Error in getStats:', error);
      throw error;
    }
  }
}

// UserProfile Model
class UserProfile {
  static async create(profileData) {
    const {
      council_id,
      member_picture,
      name,
      enrollment_number,
      committee_name,
      position,
      phone_number,
      email_id,
      address,
      instagram,
      discord,
      linkedin,
      snapchat,
      github
    } = profileData;

    const result = await db.query(
      `
      INSERT INTO user_profiles (
        council_id, member_picture, name, enrollment_number,
        committee_name, position, phone_number, email_id,
        address, instagram, discord, linkedin, snapchat, github
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
      `,
      [
        council_id, member_picture, name, enrollment_number,
        committee_name, position, phone_number, email_id,
        address, instagram, discord, linkedin, snapchat, github
      ]
    );

    return result.rows[0];
  }

  static async findByCouncilId(council_id) {
    const result = await db.query(
      `SELECT * FROM user_profiles WHERE council_id = $1`,
      [council_id]
    );
    return result.rows[0];
  }

  static async updateByCouncilId(council_id, updateData) {
    const fieldMapping = {
      council_id: 'council_id',
      memberPicture: 'member_picture',
      member_picture: 'member_picture',
      name: 'name',
      enrollmentNumber: 'enrollment_number',
      enrollment_number: 'enrollment_number',
      committeeName: 'committee_name',
      committee_name: 'committee_name',
      position: 'position',
      phoneNumber: 'phone_number',
      phone_number: 'phone_number',
      emailId: 'email_id',
      email_id: 'email_id',
      address: 'address',
      instagram: 'instagram',
      discord: 'discord',
      linkedin: 'linkedin',
      snapchat: 'snapchat',
      github: 'github'
    };

    const protectedFields = ['council_id', 'committee_name', 'position'];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value === undefined || value === null || value === '') continue;

      const dbColumnName = fieldMapping[key];
      
      if (!dbColumnName) {
        console.warn(`Skipping unknown field: ${key}`);
        continue;
      }

      if (protectedFields.includes(dbColumnName)) {
        console.warn(`Cannot update protected field: ${dbColumnName}`);
        continue;
      }

      setClauses.push(`${dbColumnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return this.findByCouncilId(council_id);
    }

    values.push(council_id);

    const query = `
      UPDATE user_profiles
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE council_id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

// Attendance Model
class Attendance {
  static async punchIn(user_id) {
    const check = await db.query(
      `
      SELECT * FROM attendance_logs
      WHERE user_id = $1 AND punch_out IS NULL
      `,
      [user_id]
    );

    if (check.rows.length > 0) {
      throw new Error('Already punched in');
    }

    const result = await db.query(
      `
      INSERT INTO attendance_logs (user_id, punch_in)
      VALUES ($1, NOW())
      RETURNING *
      `,
      [user_id]
    );

    return result.rows[0];
  }

  static async punchOut(user_id) {
    const result = await db.query(
      `
      UPDATE attendance_logs
      SET punch_out = NOW()
      WHERE user_id = $1
        AND punch_out IS NULL
      RETURNING *
      `,
      [user_id]
    );

    if (result.rows.length === 0) {
      throw new Error('No active punch-in found');
    }

    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const result = await db.query(
      `
      SELECT
        id,
        DATE(punch_in) AS date,
        punch_in,
        punch_out,
        ROUND(
          COALESCE(
            EXTRACT(EPOCH FROM (punch_out - punch_in)) / 3600,
            0
          ),
          2
        ) AS total_hours
      FROM attendance_logs
      WHERE user_id = $1
      ORDER BY punch_in DESC
      `,
      [user_id]
    );

    return result.rows.map(r => ({
      ...r,
      total_hours: Number(r.total_hours) || 0
    }));
  }

  static async getAttendanceStats(user_ids, days = 7) {
    const result = await db.query(
      `
      SELECT
        user_id,
        COUNT(*) AS total_days,
        COALESCE(
          SUM(
            CASE
              WHEN punch_out IS NOT NULL
              THEN EXTRACT(EPOCH FROM (punch_out - punch_in))
              ELSE 0
            END
          ) / 3600,
          0
        ) AS total_hours,
        COALESCE(
          AVG(
            CASE
              WHEN punch_out IS NOT NULL
              THEN EXTRACT(EPOCH FROM (punch_out - punch_in))
              ELSE NULL
            END
          ) / 3600,
          0
        ) AS avg_hours
      FROM attendance_logs
      WHERE user_id = ANY($1)
        AND punch_in >= CURRENT_DATE - INTERVAL '${days} days'
        AND punch_out IS NOT NULL
      GROUP BY user_id
      `,
      [user_ids]
    );

    return result.rows;
  }
}

// WorkReport Model
class WorkReport {
  static async create(reportData) {
    const { user_id, title, content, report_date, file_path } = reportData;
    
    const query = `
      INSERT INTO work_reports (user_id, title, content, report_date, file_path)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [user_id, title, content, report_date, file_path]);
    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const query = `
      SELECT
        id,
        title,
        content,
        report_date,
        status,
        file_path,
        created_at
      FROM work_reports
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [user_id]);
    return result.rows;
  }

  static async updateStatus(id, status, reviewed_by = null) {
    const query = `
      UPDATE work_reports 
      SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [status, reviewed_by, id]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM work_reports WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

// LeaveApplication Model
class LeaveApplication {
  static async create(leaveData) {
    const { user_id, title, content, leave_from, leave_to, file_path } = leaveData

    const result = await db.query(
      `
      INSERT INTO leave_applications
        (user_id, title, content, leave_from, leave_to, file_path)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [user_id, title, content, leave_from, leave_to, file_path]
    )

    return result.rows[0]
  }

  static async findByUserId(user_id) {
    const result = await db.query(
      `
      SELECT *
      FROM leave_applications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [user_id]
    )

    return result.rows
  }

  static async findPendingForHead(committee_name) {
    const result = await db.query(
      `
      SELECT
        la.*,
        up.name,
        up.committee_name,
        u.council_id
      FROM leave_applications la
      JOIN users u ON u.id = la.user_id
      JOIN user_profiles up ON up.council_id = u.council_id
      WHERE
        up.committee_name = $1
        AND la.head_approval = false
      ORDER BY la.created_at ASC
      `,
      [committee_name]
    )

    return result.rows
  }

  static async findPendingForGS() {
    const result = await db.query(
      `
      SELECT
        la.*,
        up.name,
        up.committee_name,
        u.council_id
      FROM leave_applications la
      JOIN users u ON u.id = la.user_id
      JOIN user_profiles up ON up.council_id = u.council_id
      WHERE
        la.head_approval = true
        AND la.gs_approval = false
      ORDER BY la.created_at ASC
      `
    )

    return result.rows
  }

  static async findById(id) {
    const result = await db.query(
      `SELECT * FROM leave_applications WHERE id = $1`,
      [id]
    )
    return result.rows[0]
  }

  static async updateHeadApproval(leaveId) {
    const result = await db.query(
      `
      UPDATE leave_applications
      SET head_approval = true
      WHERE id = $1
      RETURNING *
      `,
      [leaveId]
    )

    return result.rows[0]
  }

  static async updateGSApproval(leaveId) {
    const result = await db.query(
      `
      UPDATE leave_applications
      SET gs_approval = true
      WHERE id = $1
      RETURNING *
      `,
      [leaveId]
    )

    return result.rows[0]
  }

  static async delete(id) {
    await db.query(
      `DELETE FROM leave_applications WHERE id = $1`,
      [id]
    )
  }
}

// LoginLog Model
class LoginLog {
  static async create(user_id, ip_address, user_agent) {
    const query = `
      INSERT INTO login_logs (user_id, ip_address, user_agent)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await db.query(query, [user_id, ip_address, user_agent]);
    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const query = `
      SELECT * FROM login_logs 
      WHERE user_id = $1 
      ORDER BY login_time DESC 
      LIMIT 10
    `;
    
    const result = await db.query(query, [user_id]);
    return result.rows;
  }
}

module.exports = {
  pool: db, 
  initDB,
  User,
  UserProfile,
  Attendance,
  WorkReport,
  LeaveApplication,
  BiometricRegistration,
  LoginLog
};