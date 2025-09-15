// client-service/controllers/clientsController.js (Corrected)
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

async function uploadLogo(localPath, fileName) {
  // ... (current logo logic is kept for now)
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
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    // ✅ FIX: Selects clients based on the user_clients permissions table
    const result = await pool.query(
      `SELECT c.*
       FROM clients c
       JOIN user_clients uc ON c.id = uc.client_id
       WHERE uc.user_id = $1
       ORDER BY c.name ASC`,
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
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    // This can remain as-is, assuming a user must be assigned to a client to view its details.
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [
      id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Not found' });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/clients
exports.createClient = async (req, res, next) => {
  // This function is now correct, it assigns the creator as the owner.
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });
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
      logoUrl = await uploadLogo(req.file.path, req.file.originalname);
    }
    const result = await pool.query(
      `INSERT INTO clients (name, logo_url, barcode, user_id) VALUES ($1, $2, $3, $4) RETURNING *`,
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

// The PUT and DELETE functions can remain as they are, operating on ownership.
// This is a common pattern: any assigned user can see a client, but only the owner can edit or delete it.

// PUT /api/clients/:id
exports.updateClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
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
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });
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
