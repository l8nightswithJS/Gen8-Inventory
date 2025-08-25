// backend/controllers/scanController.js
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

// @desc    Process a scanned barcode to identify its type (item or location)
// @route   POST /api/scan
// @access  Private
exports.processScan = async (req, res) => {
  const { barcode, client_id } = req.body;

  if (!barcode || !client_id) {
    return res
      .status(400)
      .json({ message: 'barcode and client_id are required' });
  }

  // 1. Check if it's a Location barcode
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('*')
    .eq('client_id', client_id)
    .eq('code', barcode)
    .single();

  if (locationError && locationError.code !== 'PGRST116') {
    // Ignore "no rows found" error
    return handleSupabaseError(res, locationError, 'processScan (location)');
  }

  if (location) {
    // If location is found, fetch its inventory
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('quantity, items(*)')
      .eq('location_id', location.id);

    if (inventoryError) {
      return handleSupabaseError(
        res,
        inventoryError,
        'processScan (inventory)',
      );
    }

    const response = { ...location, items: inventory || [] };
    return res.json({ type: 'location', data: response });
  }

  // 2. If not a location, check if it's an Item barcode
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('client_id', client_id)
    .eq('barcode', barcode)
    .single();

  if (itemError && itemError.code !== 'PGRST116') {
    // Ignore "no rows found" error
    return handleSupabaseError(res, itemError, 'processScan (item)');
  }

  if (item) {
    return res.json({ type: 'item', data: item });
  }

  // 3. If no match is found
  return res
    .status(404)
    .json({ message: `Barcode "${barcode}" not found for this client.` });
};
