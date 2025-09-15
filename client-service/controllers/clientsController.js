// client-service/controllers/clientsController.js (Corrected & Secured)
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

// This local upload helper is fine, no changes needed.
async function uploadLogo(localPath, fileName) {
  try {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const destPath = path.join(uploadDir, fileName);
    fs.copyFileSync(localPath, destPath);
    try {
      fs.unlinkSync(localPath);
    } catch {}
    return `/uploads/${fileName}`;
  } catch (e) {
    console.warn('⚠️ Upload failed, using local file path', e.message);
    return `/uploads/${path.basename(localPath)}`;
  }
}

// GET /api/clients
exports.getAllClients = async (req, res, next) => {
  try {
    // ✅ SECURITY FIX: Only select clients that belong to the logged-in user.
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    const result = await pool.query(
      'SELECT * FROM clients WHERE user_id = $1 ORDER BY name ASC',
      [userId],
    );
    res.json(result.rows || []);
  } catch (err) {
    next(err);
  }
};

// GET /api/clients/:id
exports.getClientById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    // ✅ SECURITY FIX: Ensure the client belongs to the logged-in user.
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    const result = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Not found' });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/clients
exports.createClient = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });

    // ✅ FIX: Get the user's ID securely from the auth middleware.
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ message: 'Authentication error: User ID not found.' });

    let barcode =
      typeof req.body.barcode === 'string' ? req.body.barcode.trim() : null;
    if (barcode === '') barcode = null;

    let logoUrl = req.body.logo_url || null;
    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      logoUrl = await uploadLogo(req.file.path, fileName);
    }

    // ✅ FIX: Include user_id in the INSERT statement.
    const result = await pool.query(
      `INSERT INTO clients (name, logo_url, barcode, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, logoUrl, barcode, userId],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(409)
        .json({
          message: 'A client with this name or barcode already exists.',
        });
    }
    next(err);
  }
};

// PUT /api/clients/:id
exports.updateClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    // ✅ SECURITY FIX: Get user ID to ensure ownership.
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    const fields = {};
    if (typeof req.body.name === 'string') fields.name = req.body.name.trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'barcode')) {
      fields.barcode = req.body.barcode?.trim() || null;
    }

    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      fields.logo_url = await uploadLogo(req.file.path, fileName);
    } else if (typeof req.body.logo_url === 'string') {
      fields.logo_url = req.body.logo_url;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClauses = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(', ');
    const values = Object.values(fields);

    // ✅ SECURITY FIX: Add "AND user_id" to the WHERE clause.
    const result = await pool.query(
      `UPDATE clients SET ${setClauses} WHERE id = $${
        values.length + 1
      } AND user_id = $${values.length + 2} RETURNING *`,
      [...values, id, userId],
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({
          message:
            'Not found or you do not have permission to edit this client.',
        });

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(409)
        .json({
          message: 'A client with this name or barcode already exists.',
        });
    }
    next(err);
  }
};

// DELETE /api/clients/:id
exports.deleteClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    // ✅ SECURITY FIX: Get user ID to ensure ownership.
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    // ✅ SECURITY FIX: Add "AND user_id" to the WHERE clause.
    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId],
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({
          message:
            'Not found or you do not have permission to delete this client.',
        });

    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};
