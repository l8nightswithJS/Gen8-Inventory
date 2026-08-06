const pool = require('../db/pool');
const {
  loadClientSettings,
  validateProfileAttributes,
} = require('../controllers/_profileSettings');

function resolveItemId(req) {
  const value = Number(req.params?.id || req.body?.item_id);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function resolveClientId(req) {
  const bodyClientId = Number(req.body?.client_id);
  if (Number.isSafeInteger(bodyClientId) && bodyClientId > 0) {
    return bodyClientId;
  }

  const itemId = resolveItemId(req);
  if (!itemId) return null;

  const result = await pool.query(
    'SELECT client_id FROM items WHERE id = $1 LIMIT 1',
    [itemId],
  );
  return result.rows[0]?.client_id || null;
}

exports.validateProfileAttributes = async (req, res, next) => {
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) {
      return res.status(400).json({ message: 'Unable to resolve item client.' });
    }

    const settings = await loadClientSettings(clientId);
    if (req.body?.attributes !== undefined) {
      req.body.attributes = validateProfileAttributes(
        req.body.attributes,
        settings,
      );
    }

    if (
      (req.body?.uom === undefined || req.body?.uom === null || req.body?.uom === '') &&
      settings.default_uom
    ) {
      req.body.uom = settings.default_uom;
    }

    req.inventorySettings = settings;
    return next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports._test = { resolveItemId };
