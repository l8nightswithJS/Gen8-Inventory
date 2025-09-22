const pool = require('../db/pool');
const { createClient } = require('@supabase/supabase-js');

// --- Supabase Setup ---
exports.createClient = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  let logo_url = null; // Initialize logo_url as null

  const dbClient = await pool.connect();

  try {
    // Check if a file was uploaded with the request
    if (req.file) {
      // If a file exists, upload it to Supabase and get the public URL
      logo_url = await uploadLogoToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
    }

    await dbClient.query('BEGIN');

    // Step 1: Insert the new client with the correct logo_url
    const clientInsertQuery =
      'INSERT INTO clients (name, logo_url, user_id) VALUES ($1, $2, $3) RETURNING id';
    const clientResult = await dbClient.query(clientInsertQuery, [
      name,
      logo_url, // This will now be either null or the Supabase URL
      userId,
    ]);
    const newClientId = clientResult.rows[0].id;

    // Step 2: Link the user to the new client (this part is already correct)
    const userClientInsertQuery =
      'INSERT INTO user_clients (user_id, client_id) VALUES ($1, $2)';
    await dbClient.query(userClientInsertQuery, [userId, newClientId]);

    await dbClient.query('COMMIT');

    const newClient = await dbClient.query(
      'SELECT * FROM clients WHERE id = $1',
      [newClientId],
    );

    res.status(201).json(newClient.rows[0]);
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Create client transaction error:', error);
    res
      .status(500)
      .json({ message: 'Error creating client', error: error.message });
  } finally {
    dbClient.release();
  }
};

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
exports.createClient = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id; // Get user ID from authenticated user
  const logo_url = req.file ? req.file.path : null; // This will be changed in the next step

  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    // Step 1: Insert the new client and get its ID
    const clientInsertQuery =
      'INSERT INTO clients (name, logo_url, user_id) VALUES ($1, $2, $3) RETURNING id';
    const clientResult = await dbClient.query(clientInsertQuery, [
      name,
      logo_url,
      userId,
    ]);
    const newClientId = clientResult.rows[0].id;

    // Step 2: Link the user to the new client in the user_clients table
    const userClientInsertQuery =
      'INSERT INTO user_clients (user_id, client_id) VALUES ($1, $2)';
    await dbClient.query(userClientInsertQuery, [userId, newClientId]);

    await dbClient.query('COMMIT');

    // Fetch the full new client object to return
    const newClient = await dbClient.query(
      'SELECT * FROM clients WHERE id = $1',
      [newClientId],
    );

    res.status(201).json(newClient.rows[0]);
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Create client transaction error:', error);
    res
      .status(500)
      .json({ message: 'Error creating client', error: error.message });
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
