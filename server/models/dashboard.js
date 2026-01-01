const db = require('./db');

async function getDashboardStats() {
  const totalUsers = await db.query(
    `SELECT COUNT(*) FROM users WHERE is_active = true`
  );

  const activeToday = await db.query(
    `SELECT COUNT(DISTINCT user_id)
     FROM login_logs
     WHERE DATE(login_time) = CURRENT_DATE`
  );

  const committees = await db.query(
    `SELECT COUNT(DISTINCT committee_name)
     FROM user_profiles`
  );

  const attendanceRate = await db.query(`
    SELECT
      ROUND(
        (COUNT(DISTINCT user_id)::decimal /
        (SELECT COUNT(*) FROM users)) * 100
      ) AS rate
    FROM attendance
    WHERE created_at = CURRENT_DATE
  `);

  const committeeDistribution = await db.query(`
    SELECT up.committee_name, COUNT(a.user_id) AS count
    FROM attendance a
    JOIN user_profiles up ON up.user_id = a.user_id
    WHERE a.created_at = CURRENT_DATE
    GROUP BY up.committee_name
  `);

  const recentActivity = await db.query(`
    SELECT * FROM (
      SELECT 'login' AS type, login_time AS time FROM login_logs
      UNION ALL
      SELECT 'attendance', punch_in FROM attendance
      UNION ALL
      SELECT 'report', created_at FROM work_reports
      UNION ALL
      SELECT 'leave', created_at FROM leave_applications
    ) t
    ORDER BY time DESC
    LIMIT 10
  `);

  const dailyAttendance = await db.query(`
    SELECT created_at, COUNT(*) AS count
    FROM attendance
    GROUP BY created_at
    ORDER BY created_at
  `);

  return {
    totalUsers: totalUsers.rows[0].count,
    activeToday: activeToday.rows[0].count,
    committees: committees.rows[0].count,
    attendanceRate: attendanceRate.rows[0]?.rate || 0,
    committeeDistribution: committeeDistribution.rows,
    recentActivity: recentActivity.rows,
    dailyAttendance: dailyAttendance.rows
  };
}

module.exports = { getDashboardStats };
