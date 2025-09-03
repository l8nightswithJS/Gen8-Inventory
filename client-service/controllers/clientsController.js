// client-service/controllers/clientsController.js
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool'); // <-- PostgreSQL connection (pg Pool)

// Helper: Upload logos to local /uploads (removed Supabase storage dependency)
async function uploadLogo(localPath, fileName) {
  try {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const destPath = path.join(uploadDir, fileName);
    fs.copyFileSync(localPath, destPath);

    // Clean up temp file
    try {
      fs.unlinkSync(localPath);
    } catch {}

    // Return a relative URL (static server must expose /uploads)
    return `/uploads/${fileName}`;
  } catch (e) {
    console.warn('⚠️ Upload failed, using local file path', e.message);
    return `/uploads/${path.basename(localPath)}`;
  }
}

// GET /api/clients
exports.getAllClients = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY id ASC');
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
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });

    let barcode =
      typeof req.body.barcode === 'string' ? req.body.barcode.trim() : null;
    if (barcode === '') barcode = null;

    let logoUrl = req.body.logo_url || null;
    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      const localPath = req.file.path;
      logoUrl = await uploadLogo(localPath, fileName);
    }

    const insertObj = { name, logo_url: logoUrl, barcode };

    const result = await pool.query(
      `INSERT INTO clients (name, logo_url, barcode)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [insertObj.name, insertObj.logo_url, insertObj.barcode],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Handle unique constraint violation (duplicate barcode)
    if (
      err.code === '23505' ||
      /duplicate key value/i.test(err.message || '')
    ) {
      return res.status(409).json({ message: 'Barcode already in use' });
    }
    next(err);
  }
};

// PUT /api/clients/:id
exports.updateClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const fields = {};
    if (typeof req.body.name === 'string') fields.name = req.body.name.trim();

    if (Object.prototype.hasOwnProperty.call(req.body, 'barcode')) {
      if (typeof req.body.barcode === 'string') {
        const v = req.body.barcode.trim();
        fields.barcode = v === '' ? null : v;
      } else if (req.body.barcode == null) {
        fields.barcode = null;
      }
    }

    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      const localPath = req.file.path;
      fields.logo_url = await uploadLogo(localPath, fileName);
    } else if (typeof req.body.logo_url === 'string') {
      fields.logo_url = req.body.logo_url;
    }

    const setClauses = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(', ');
    const values = Object.values(fields);

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const result = await pool.query(
      `UPDATE clients SET ${setClauses} WHERE id = $${
        values.length + 1
      } RETURNING *`,
      [...values, id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Not found' });

    res.json(result.rows[0]);
  } catch (err) {
    if (
      err.code === '23505' ||
      /duplicate key value/i.test(err.message || '')
    ) {
      return res.status(409).json({ message: 'Barcode already in use' });
    }
    next(err);
  }
};

// DELETE /api/clients/:id
exports.deleteClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};
