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

function wantsArchivedClients(req) {
  return req.user?.role === 'admin' && req.query?.include_archived === 'true';
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
      const archivedClause = wantsArchivedClients(req)
        ? ''
        : 'WHERE client.archived_at IS NULL';
      const result = await pool.query(
        `SELECT client.*, COALESCE(settings.profile_key, 'general') AS inventory_profile,
                'edit'::text AS access_level
         FROM clients AS client
         LEFT JOIN client_inventory_settings AS settings ON settings.client_id = client.id
         ${archivedClause}
         ORDER BY client.archived_at NULLS FIRST, client.name ASC`,
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
         AND client.archived_at IS NULL
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
      `UPDATE clients SET ${setClauses} WHERE id = $${values.length + 1} AND archived_at IS NULL RETURNING *`,
      [...values, id],
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Active client not found' });
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
       WHERE client.id = $1
         AND user_client.user_id = $2
         AND client.archived_at IS NULL
       LIMIT 1`,
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

    const result = await pool.query(
      `UPDATE clients
       SET archived_at = COALESCE(archived_at, now())
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Client not found' });
    return res.json({ message: 'Client archived successfully.', client: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

exports.restoreClient = async (req, res, next) => {
  try {
    const id = getClientId(req);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid id' });

    const result = await pool.query(
      `UPDATE clients
       SET archived_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Client not found' });
    return res.json({ message: 'Client restored successfully.', client: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

exports.permanentlyDeleteClient = async (req, res, next) => {
  const id = getClientId(req);
  const confirmation = typeof req.body?.confirm_name === 'string'
    ? req.body.confirm_name.trim()
    : '';

  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid id' });

  let dbClient;
  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const clientResult = await dbClient.query(
      'SELECT id, name, archived_at FROM clients WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (!clientResult.rowCount) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ message: 'Client not found' });
    }

    const client = clientResult.rows[0];
    if (!client.archived_at) {
      await dbClient.query('ROLLBACK');
      return res.status(409).json({ message: 'Archive the client before permanently deleting it.' });
    }
    if (confirmation !== client.name) {
      await dbClient.query('ROLLBACK');
      return res.status(400).json({ message: 'Permanent delete confirmation does not match the client name.' });
    }

    const movementResult = await dbClient.query(
      `DELETE FROM inventory_movements
       WHERE item_id IN (SELECT id FROM items WHERE client_id = $1)`,
      [id],
    );

    await dbClient.query('DELETE FROM clients WHERE id = $1', [id]);
    await dbClient.query('COMMIT');

    return res.json({
      message: 'Client permanently deleted.',
      deleted_client_id: id,
      deleted_movement_count: movementResult.rowCount,
    });
  } catch (err) {
    if (dbClient) {
      try { await dbClient.query('ROLLBACK'); } catch {}
    }
    return next(err);
  } finally {
    if (dbClient) dbClient.release();
  }
};
