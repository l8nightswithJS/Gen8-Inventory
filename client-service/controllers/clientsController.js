const pool = require('../db/pool');
const { createClient } = require('@supabase/supabase-js');
const {
  getProfilePreset,
  normalizeProfileKey,
} = require('../../packages/inventory-profiles');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const LOGO_BUCKET = 'client-logos';

function getClientId(req) {
  return Number(req.params?.clientId ?? req.params?.id);
}

async function uploadLogoToSupabase(fileBuffer, originalName, fileType) {
  const fileName = `${Date.now()}_${originalName}`;
  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(fileName, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: fileType,
    });
  if (error) throw error;
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(data.path).data.publicUrl;
}

exports.getAllClients = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentication error' });

    if (req.user?.role === 'admin') {
      const result = await pool.query(
        `SELECT client.*, COALESCE(settings.profile_key, 'general') AS inventory_profile,
                'edit'::text AS access_level
         FROM clients AS client
         LEFT JOIN client_inventory_settings AS settings ON settings.client_id = client.id
         ORDER BY client.name ASC`,
      );
      return res.json(result.rows || []);
    }

    const result = await pool.query(
      `SELECT client.*, COALESCE(settings.profile_key, 'general') AS inventory_profile,
              user_client.access_level
       FROM clients AS client
       JOIN user_clients AS user_client ON client.id = user_client.client_id
       LEFT JOIN client_inventory_settings AS settings ON settings.client_id = client.id
       WHERE user_client.user_id = $1
       ORDER BY client.name ASC`,
      [userId],
    );
    return res.json(result.rows || []);
  } catch (err) {
    return next(err);
  }
};

exports.createClient = async (req, res, next) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const userId = req.user?.id;
  const profileKey = normalizeProfileKey(req.body?.profile_key);
  const preset = getProfilePreset(profileKey);
  let logo_url = null;
  let dbClient = null;
  let transactionStarted = false;

  if (!name) return res.status(400).json({ message: 'Client name is required' });
  if (!userId) return res.status(401).json({ message: 'Authentication error' });

  try {
    dbClient = await pool.connect();
    if (req.file) {
      logo_url = await uploadLogoToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
    }

    await dbClient.query('BEGIN');
    transactionStarted = true;
    const clientResult = await dbClient.query(
      'INSERT INTO clients (name, logo_url, user_id) VALUES ($1, $2, $3) RETURNING id',
      [name, logo_url, userId],
    );
    const newClientId = clientResult.rows[0].id;

    await dbClient.query(
      `INSERT INTO user_clients (user_id, client_id, access_level)
       VALUES ($1, $2, 'edit') ON CONFLICT (user_id, client_id)
       DO UPDATE SET access_level = 'edit'`,
      [userId, newClientId],
    );

    await dbClient.query(
      `INSERT INTO client_inventory_settings (
         client_id, profile_key, default_uom, display_columns, field_definitions, import_aliases
       ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
      [
        newClientId,
        preset.key,
        preset.defaultUom,
        JSON.stringify(preset.displayColumns),
        JSON.stringify(preset.fieldDefinitions),
        JSON.stringify(preset.importAliases),
      ],
    );

    const newClient = await dbClient.query(
      `SELECT client.*, settings.profile_key AS inventory_profile, 'edit'::text AS access_level
       FROM clients AS client
       JOIN client_inventory_settings AS settings ON settings.client_id = client.id
       WHERE client.id = $1`,
      [newClientId],
    );

    await dbClient.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json(newClient.rows[0]);
  } catch (error) {
    if (dbClient && transactionStarted) {
      try { await dbClient.query('ROLLBACK'); } catch {}
    }
    if (error.code === '28P01') {
      return res.status(503).json({ message: 'Client database credentials are invalid.' });
    }
    return next(error);
  } finally {
    if (dbClient) dbClient.release();
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    const id = getClientId(req);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid id' });

    const fields = {};
    if (typeof req.body.name === 'string') fields.name = req.body.name.trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'barcode')) fields.barcode = req.body.barcode?.trim() || null;
    if (req.file) {
      fields.logo_url = await uploadLogoToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else if (Object.prototype.hasOwnProperty.call(req.body, 'logo_url')) {
      fields.logo_url = req.body.logo_url || null;
    }

    if (Object.keys(fields).length === 0) return res.status(400).json({ message: 'No fields to update' });

    const setClauses = Object.keys(fields).map((key, idx) => `"${key}" = $${idx + 1}`).join(', ');
    const values = Object.values(fields);
    const result = await pool.query(
      `UPDATE clients SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Client not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
};

exports.getClientById = async (req, res, next) => {
  try {
    const id = getClientId(req);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid id' });

    if (req.user?.role === 'admin') {
      const result = await pool.query(
        `SELECT client.*, COALESCE(settings.profile_key, 'general') AS inventory_profile,
                'edit'::text AS access_level
         FROM clients AS client
         LEFT JOIN client_inventory_settings AS settings ON settings.client_id = client.id
         WHERE client.id = $1 LIMIT 1`,
        [id],
      );
      if (!result.rows.length) return res.status(404).json({ message: 'Client not found' });
      return res.json(result.rows[0]);
    }

    const result = await pool.query(
      `SELECT client.*, COALESCE(settings.profile_key, 'general') AS inventory_profile,
              user_client.access_level
       FROM clients AS client
       JOIN user_clients AS user_client ON user_client.client_id = client.id
       LEFT JOIN client_inventory_settings AS settings ON settings.client_id = client.id
       WHERE client.id = $1 AND user_client.user_id = $2 LIMIT 1`,
      [id, req.user?.id],
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Client not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    const id = getClientId(req);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid id' });
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Client not found' });
    return res.json({ message: 'Client deleted successfully.' });
  } catch (err) {
    return next(err);
  }
};
