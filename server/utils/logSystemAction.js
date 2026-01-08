const { pool } = require('../models')

module.exports = async function logSystemAction({
  actorUserId,
  actorRole,
  action,
  entityType,
  entityId,
  description
}) {
  await pool.query(
    `
    INSERT INTO system_logs
      (actor_user_id, actor_role, action, entity_type, entity_id, description)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      actorUserId,
      actorRole,
      action,
      entityType,
      entityId,
      description
    ]
  )
}
