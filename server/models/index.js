const fs = require('fs');
const path = require('path');
const db = require('./db');

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
      await db.query(schema);
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
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    const setClause = fields
      .map((f, i) => `${f} = $${i + 2}`)
      .join(', ');

    const result = await db.query(
      `
      UPDATE user_profiles
      SET ${setClause}, updated_at = NOW()
      WHERE council_id = $1
      RETURNING *
      `,
      [council_id, ...values]
    );

    return result.rows[0];
  }
}




// Attendance Model
class Attendance {
  static async punchIn(user_id) {
    // prevent double punch-in without punch-out
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
          EXTRACT(EPOCH FROM (punch_out - punch_in)) / 3600,
          2
        ) AS total_hours
      FROM attendance_logs
      WHERE user_id = $1
      ORDER BY punch_in DESC
      `,
      [user_id]
    );

    return result.rows;
  }

  static async getAttendanceStats(user_ids, days = 7) {
    const result = await db.query(
      `
      SELECT
        user_id,
        COUNT(*) AS total_days,
        SUM(
          EXTRACT(EPOCH FROM (punch_out - punch_in)) / 3600
        ) AS total_hours,
        AVG(
          EXTRACT(EPOCH FROM (punch_out - punch_in)) / 3600
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
  /* ================= CREATE ================= */
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

  /* ================= USER LEAVES ================= */
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

  /* ================= PENDING FOR HEAD ================= */
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

  /* ================= PENDING FOR GS ================= */
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

  /* ================= FIND BY ID ================= */
  static async findById(id) {
    const result = await db.query(
      `SELECT * FROM leave_applications WHERE id = $1`,
      [id]
    )
    return result.rows[0]
  }

  /* ================= APPROVE BY HEAD ================= */
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

  /* ================= APPROVE BY GS ================= */
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

  /* ================= DELETE ================= */
  static async delete(id) {
    await db.query(
      `DELETE FROM leave_applications WHERE id = $1`,
      [id]
    )
  }
}


// BiometricRegistration Model
class BiometricRegistration {
  static async create(user_id, fingerprint_data) {
    const query = `
      INSERT INTO biometric_registrations (user_id, fingerprint_data)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await db.query(query, [user_id, fingerprint_data]);
    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const query = 'SELECT * FROM biometric_registrations WHERE user_id = $1';
    const result = await db.query(query, [user_id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT br.*, up.name, up.council_id
      FROM biometric_registrations br
      JOIN user_profiles up ON br.user_id = up.user_id
      ORDER BY br.registered_at DESC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM biometric_registrations WHERE id = $1';
    await db.query(query, [id]);
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