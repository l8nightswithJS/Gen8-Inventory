const pool = require('../db/pool');
const { createClient } = require('@supabase/supabase-js');

// --- Supabase Setup ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const LOGO_BUCKET = 'client-logos';

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

    if (error) {
      throw error;
    }

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
        req.file.buffer, // ✅ FIX: Use req.file.buffer
        req.file.originalname,
        req.file.mimetype,
      );
    }

    await dbClient.query('BEGIN');

    const createClientResult = await dbClient.query(
      `INSERT INTO clients (name, logo_url, barcode) VALUES ($1, $2, $3) RETURNING *`, // Removed user_id from here
      [name, logoUrl, barcode],
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
      return res.status(409).json({
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
  console.log('Inspecting incoming file:', req.file);
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    const permissionCheck = await pool.query(
      'SELECT client_id FROM user_clients WHERE user_id = $1 AND client_id = $2',
      [userId, id],
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        message: 'You do not have permission to edit this client.',
      });
    }

    const fields = {};
    if (typeof req.body.name === 'string') fields.name = req.body.name.trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'barcode')) {
      fields.barcode = req.body.barcode?.trim() || null;
    }

    // ✅ FIX: Added missing file upload logic
    if (req.file) {
      fields.logo_url = await uploadLogoToSupabase(
        req.file.buffer,
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
      } RETURNING *`,
      [...values, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update client error:', err);
    next(err);
  }
};

// GET /api/clients/:id
exports.getClientById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    // Note: You may want to add a permission check here as well
    // For now, it allows any authenticated user to see any client by ID

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

// DELETE /api/clients/:id
exports.deleteClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: 'Authentication error' });

    // ✅ FIX: Refactored to use the correct security model
    const permissionCheck = await pool.query(
      'SELECT client_id FROM user_clients WHERE user_id = $1 AND client_id = $2',
      [userId, id],
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        message: 'You do not have permission to delete this client.',
      });
    }

    // If you have cascade delete set up on your `clients` table's foreign keys,
    // the following is sufficient. Otherwise, you must delete related records first.
    // Assuming cascade delete is in place for simplicity.
    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(200).json({ message: 'Client deleted successfully.' });
  } catch (err) {
    console.error('Delete client error:', err);
    next(err);
  }
};
