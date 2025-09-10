// auth-service/controllers/userController.js
const { sbAdmin } = require('../lib/supabaseClient');

const handleSupabaseError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
    details: error.message,
  });
};

exports.getAllUsers = async (req, res) => {
  const { data, error } = await sbAdmin
    .from('users')
    .select('id, email, role, approved')
    .order('email', { ascending: true });
  if (error) return handleSupabaseError(res, error, 'getAllUsers');
  res.json(data || []);
};

exports.getPendingUsers = async (req, res) => {
  const { data, error } = await sbAdmin
    .from('users')
    .select('id, email, role, approved')
    .eq('approved', false)
    .order('email', { ascending: true });
  if (error) return handleSupabaseError(res, error, 'getPendingUsers');
  res.json(data || []);
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await sbAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return handleSupabaseError(res, error, 'getUserById');
  if (!data) return res.status(404).json({ message: 'User not found' });
  res.json(data);
};

exports.approveUser = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await sbAdmin
    .from('users')
    .update({ approved: true })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'approveUser');
  res.json({ message: 'User approved successfully', user: data[0] });
};

// Add this function to userController.js
exports.assignClientToUser = async (req, res) => {
  const { id } = req.params;
  const { client_id } = req.body;

  const { data, error } = await sbAdmin
    .from('users')
    .update({ client_id: client_id })
    .eq('id', id)
    .select();

  if (error) return handleSupabaseError(res, error, 'assignClientToUser');
  res.json({ message: 'User assigned to client successfully', user: data[0] });
};

exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const { data, error } = await sbAdmin
    .from('users')
    .update({ role })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'updateUserRole');
  res.json({ message: 'User updated successfully', user: data[0] });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const { error } = await sbAdmin.auth.admin.deleteUser(id);
  if (error) {
    return handleSupabaseError(res, error, 'deleteUser');
  }
  res.status(204).send();
};

exports.updateUserClients = async (req, res) => {
  const { id } = req.params;
  const { client_ids } = req.body; // Expecting an array of numbers, e.g., [1, 17]

  if (!Array.isArray(client_ids)) {
    return res.status(400).json({ message: 'client_ids must be an array.' });
  }

  const client = await sbAdmin.rpc('get_db_client'); // Using Supabase's direct connection pool for transaction
  try {
    await client.query('BEGIN');

    // First, delete all existing client associations for this user.
    await client.query('DELETE FROM user_clients WHERE user_id = $1', [id]);

    // If the new list is not empty, insert the new associations.
    if (client_ids.length > 0) {
      const insertValues = client_ids
        .map((clientId) => `('${id}', ${clientId})`)
        .join(',');
      const insertQuery = `INSERT INTO user_clients (user_id, client_id) VALUES ${insertValues}`;
      await client.query(insertQuery);
    }

    await client.query('COMMIT');
    res.json({ message: `User's client access updated successfully.` });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleSupabaseError(res, error, 'updateUserClients');
  } finally {
    client.release();
  }
};
