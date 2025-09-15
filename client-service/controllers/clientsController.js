// client-service/controllers/clientsController.js (Final Version with Correct Bucket)
const fs = require('fs');
const pool = require('../db/pool');
const { createClient } = require('@supabase/supabase-js');

// --- Supabase Setup ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);
// ✅ FIX: Updated to match your bucket name
const LOGO_BUCKET = 'client-logos';

// Correctly uploads a file to Supabase Storage and returns the public URL
async function uploadLogoToSupabase(localPath, originalName, fileType) {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const fileName = `${Date.now()}_${originalName}`;

    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(fileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileType,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  } finally {
    try {
      fs.unlinkSync(localPath);
    } catch {}
  }
}

// GET /api/clients
exports.getAllClients = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });
    const result = await pool.query(
      `SELECT c.* FROM clients c JOIN user_clients uc ON c.id = uc.client_id WHERE uc.user_id = $1 ORDER BY c.name ASC`,
      [userId],
    );
    res.json(result.rows || []);
  } catch (err) {
    next(err);
  }
};

// POST /api/clients
exports.createClient = async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ message: 'Authentication error: User ID not found.' });

    let barcode = req.body.barcode?.trim() || null;
    let logoUrl = req.body.logo_url || null;

    if (req.file) {
      logoUrl = await uploadLogoToSupabase(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
      );
    }

    await dbClient.query('BEGIN');

    const createClientResult = await dbClient.query(
      `INSERT INTO clients (name, logo_url, barcode, user_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, logoUrl, barcode, userId],
    );
    const newClient = createClientResult.rows[0];

    await dbClient.query(
      `INSERT INTO user_clients (user_id, client_id) VALUES ($1, $2)`,
      [userId, newClient.id],
    );

    await dbClient.query('COMMIT');
    res.status(201).json(newClient);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    if (err.code === '23505')
      return res
        .status(409)
        .json({
          message: 'A client with this name or barcode already exists.',
        });
    console.error('Create client error:', err);
    next(err);
  } finally {
    dbClient.release();
  }
};

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
      fields.logo_url = await uploadLogoToSupabase(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
      );
    } else if (Object.prototype.hasOwnProperty.call(req.body, 'logo_url')) {
      fields.logo_url = req.body.logo_url || null;
    }

    if (Object.keys(fields).length === 0)
      return res.status(400).json({ message: 'No fields to update' });

    const setClauses = Object.keys(fields)
      .map((key, idx) => `"${key}" = $${idx + 1}`)
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
    if (err.code === '23505')
      return res
        .status(409)
        .json({
          message: 'A client with this name or barcode already exists.',
        });
    console.error('Update client error:', err);
    next(err);
  }
};

// ... The GET by ID and DELETE functions do not need changes ...
exports.getClientById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });
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
