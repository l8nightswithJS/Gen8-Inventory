// backend/controllers/locationsController.js
const supabase = require('../lib/supabaseClient');

const handleSupabaseError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res
    .status(500)
    .json({
      message: `Internal server error during ${context}`,
      details: error.message,
    });
};

// @desc    Get all locations for a specific client
// @route   GET /api/locations
// @access  Private
exports.getLocations = async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ message: 'client_id is required' });
  }
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('client_id', client_id);
  if (error) return handleSupabaseError(res, error, 'getLocations');
  res.json(data || []);
};

// @desc    Create a new location
// @route   POST /api/locations
// @access  Private
exports.createLocation = async (req, res) => {
  const { client_id, code, description } = req.body;
  const { data, error } = await supabase
    .from('locations')
    .insert({ client_id, code, description })
    .select();
  if (error) return handleSupabaseError(res, error, 'createLocation');
  res.status(201).json(data[0]);
};
