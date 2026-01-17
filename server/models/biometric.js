// File: /server/models/biometric.js

const db = require('./db');

class BiometricRegistration {
  // Create new biometric registration
  static async create(councilId, name, fingerprintTemplate) {
    try {
      console.log('📝 Creating biometric for:', councilId);
      
      // Get user_id from council_id
      const userRes = await db.query(
        'SELECT id FROM users WHERE council_id = $1',
        [councilId]
      );

      if (!userRes.rows.length) {
        throw new Error(`User not found for council_id: ${councilId}`);
      }

      const userId = userRes.rows[0].id;

      // Insert biometric registration
      const result = await db.query(
        `INSERT INTO biometric_registrations 
         (user_id, council_id, name, fingerprint_template, is_active, registered_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         RETURNING *`,
        [userId, councilId, name, fingerprintTemplate]
      );

      console.log('✅ Biometric created:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ BiometricRegistration.create error:', error.message);
      throw error;
    }
  }

  // Find by council ID
  static async findByCouncilId(councilId) {
    try {
      const result = await db.query(
        'SELECT * FROM biometric_registrations WHERE council_id = $1',
        [councilId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ BiometricRegistration.findByCouncilId error:', error.message);
      throw error;
    }
  }

  // Find by ID
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM biometric_registrations WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ BiometricRegistration.findById error:', error.message);
      throw error;
    }
  }

  // Update biometric
  static async update(id, fingerprintTemplate) {
    try {
      const result = await db.query(
        `UPDATE biometric_registrations 
         SET fingerprint_template = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [fingerprintTemplate, id]
      );

      console.log('✅ Biometric updated:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ BiometricRegistration.update error:', error.message);
      throw error;
    }
  }

  // Delete biometric
  static async delete(id) {
    try {
      await db.query(
        'DELETE FROM biometric_registrations WHERE id = $1',
        [id]
      );
      console.log('✅ Biometric deleted:', id);
    } catch (error) {
      console.error('❌ BiometricRegistration.delete error:', error.message);
      throw error;
    }
  }

  // Verify fingerprint (for attendance)
  static async verify(councilId, fingerprintTemplate) {
    try {
      // In production, this would compare fingerprint templates
      // For now, just check if council_id exists and is active
      const result = await db.query(
        'SELECT * FROM biometric_registrations WHERE council_id = $1 AND is_active = true',
        [councilId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      // TODO: Implement actual fingerprint matching here
      // For now, return true if registered
      return true;
    } catch (error) {
      console.error('❌ BiometricRegistration.verify error:', error.message);
      throw error;
    }
  }

  // Get all registrations
  static async findAll() {
    try {
      const result = await db.query(
        'SELECT * FROM biometric_registrations WHERE is_active = true ORDER BY registered_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ BiometricRegistration.findAll error:', error.message);
      throw error;
    }
  }

  // Count registered
  static async countRegistered() {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM biometric_registrations WHERE is_active = true'
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('❌ BiometricRegistration.countRegistered error:', error.message);
      throw error;
    }
  }
}

module.exports = BiometricRegistration;