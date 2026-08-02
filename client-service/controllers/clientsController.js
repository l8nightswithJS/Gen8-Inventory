const pool = require('../db/pool');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const LOGO_BUCKET = 'client-logos';

function getClientId(req) {
  return Number(req.params?.clientId ?? req.params?.id);
}

async function uploadLogoToSupabase(fileBuffer, originalName, fileType) {
  try {
    const fileName = `${Date.now()}_${originalName}`;
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(fileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileType,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Error uploading to Supabase:', err.message);
    throw new Error('Failed to upload logo to cloud storage.');
  }
}

// GET /api/clients
exports.getAllClients = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication error' });
    }

    const result = await pool.query(
      `SELECT c.*
       FROM clients c
       JOIN user_clients uc ON c.id = uc.client_id
       WHERE uc.user_id = $1
       ORDER BY c.name ASC`,
      [userId],
    );

    return res.json(result.rows || []);
  } catch (err) {
    return next(err);
  }
};

// POST /api/clients/add
exports.createClient = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  let logo_url = null;

  const dbClient = await pool.connect();

  try {
    if (req.file) {
      logo_url = await uploadLogoToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
    }

    await dbClient.query('BEGIN');

    const clientResult = await dbClient.query(
      'INSERT INTO clients (name, logo_url, user_id) VALUES ($1, $2, $3) RETURNING id',
      [name, logo_url, userId],
    );
    const newClientId = clientResult.rows[0].id;

    await dbClient.query(
      'INSERT INTO user_clients (user_id, client_id) VALUES ($1, $2)',
      [userId, newClientId],
    );

    await dbClient.query('COMMIT');

    const newClient = await dbClient.query(
      'SELECT * FROM clients WHERE id = $1',
      [newClientId],
    );

    return res.status(201).json(newClient.rows[0]);
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Create client transaction error:', error);
    return res
      .status(500)
      .json({ message: 'Error creating client', error: error.message });
  } finally {
    dbClient.release();
  }
};

// PUT /api/clients/:clientId
exports.updateClient = async (req, res, next) => {
  try {
    const id = getClientId(req);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication error' });
    }

    const permissionCheck = await pool.query(
      'SELECT client_id FROM user_clients WHERE user_id = $1 AND client_id = $2',
      [userId, id],
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const fields = {};
    if (typeof req.body.name === 'string') fields.name = req.body.name.trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'barcode')) {
      fields.barcode = req.body.barcode?.trim() || null;
    }

    if (req.file) {
      fields.logo_url = await uploadLogoToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
    } else if (Object.prototype.hasOwnProperty.call(req.body, 'logo_url')) {
      fields.logo_url = req.body.logo_url || null;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClauses = Object.keys(fields)
      .map((key, idx) => `"${key}" = $${idx + 1}`)
      .join(', ');
    const values = Object.values(fields);

    const result = await pool.query(
      `UPDATE clients SET ${setClauses} WHERE id = $${
        values.length + 1
      } RETURNING *`,
      [...values, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update client error:', err);
    return next(err);
  }
};

// GET /api/clients/:clientId
exports.getClientById = async (req, res, next) => {
  try {
    const id = getClientId(req);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication error' });
    }

    const result = await pool.query(
      `SELECT c.*
       FROM clients c
       JOIN user_clients uc ON uc.client_id = c.id
       WHERE c.id = $1 AND uc.user_id = $2
       LIMIT 1`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/clients/:clientId
exports.deleteClient = async (req, res, next) => {
  try {
    const id = getClientId(req);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication error' });
    }

    const permissionCheck = await pool.query(
      'SELECT client_id FROM user_clients WHERE user_id = $1 AND client_id = $2',
      [userId, id],
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    return res.status(200).json({ message: 'Client deleted successfully.' });
  } catch (err) {
    console.error('Delete client error:', err);
    return next(err);
  }
};
