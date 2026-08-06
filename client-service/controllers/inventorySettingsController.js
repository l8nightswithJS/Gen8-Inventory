const pool = require('../db/pool');
const {
  CORE_FIELDS,
  DERIVED_FIELDS,
  PROFILE_KEYS,
  PROFILE_PRESETS,
  getProfilePreset,
  normalizeFieldKey,
  normalizeProfileKey,
  normalizeSettings,
  sanitizeFieldDefinition,
} = require('../../packages/inventory-profiles');

function parseClientId(req) {
  const value = Number(req.params?.clientId);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function ensureSettings(clientId) {
  const preset = getProfilePreset('general');
  await pool.query(
    `INSERT INTO client_inventory_settings (
       client_id,
       profile_key,
       default_uom,
       display_columns,
       field_definitions,
       import_aliases
     )
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
     ON CONFLICT (client_id) DO NOTHING`,
    [
      clientId,
      preset.key,
      preset.defaultUom,
      JSON.stringify(preset.displayColumns),
      JSON.stringify(preset.fieldDefinitions),
      JSON.stringify(preset.importAliases),
    ],
  );
}

async function readSettings(clientId) {
  await ensureSettings(clientId);

  const [settingsResult, templatesResult] = await Promise.all([
    pool.query(
      `SELECT
         settings.*,
         location.code AS default_location_code
       FROM client_inventory_settings AS settings
       LEFT JOIN locations AS location
         ON location.id = settings.default_location_id
       WHERE settings.client_id = $1`,
      [clientId],
    ),
    pool.query(
      `SELECT
         template.*,
         location.code AS default_location_code
       FROM client_import_templates AS template
       LEFT JOIN locations AS location
         ON location.id = template.default_location_id
       WHERE template.client_id = $1
       ORDER BY template.is_default DESC, template.name ASC`,
      [clientId],
    ),
  ]);

  const row = settingsResult.rows[0] || {};
  return {
    ...normalizeSettings(row),
    client_id: clientId,
    default_location_code: row.default_location_code || null,
    import_templates: templatesResult.rows || [],
  };
}

exports.listProfiles = async (_req, res) => {
  const profiles = PROFILE_KEYS.map((key) => {
    const preset = getProfilePreset(key);
    return {
      key: preset.key,
      label: preset.label,
      default_uom: preset.defaultUom,
      display_columns: preset.displayColumns,
      field_definitions: preset.fieldDefinitions,
      import_aliases: preset.importAliases,
    };
  });

  return res.json({
    profiles,
    core_fields: CORE_FIELDS,
    derived_fields: DERIVED_FIELDS,
  });
};

exports.getSettings = async (req, res, next) => {
  const clientId = parseClientId(req);
  if (!clientId) return res.status(400).json({ message: 'Invalid client id.' });

  try {
    return res.json(await readSettings(clientId));
  } catch (error) {
    return next(error);
  }
};

function normalizeDefaultLocation(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('default_location_id must be a positive integer.');
  }
  return parsed;
}

function normalizeColumns(value, fallback) {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) throw new Error('display_columns must be an array.');
  return Array.from(
    new Set(value.map(normalizeFieldKey).filter(Boolean)),
  ).slice(0, 50);
}

function normalizeDefinitions(value, fallback) {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) {
    throw new Error('field_definitions must be an array.');
  }

  const definitions = value.map(sanitizeFieldDefinition).filter(Boolean);
  const keys = new Set();
  for (const definition of definitions) {
    if (keys.has(definition.key)) {
      throw new Error(`Duplicate custom field key: ${definition.key}.`);
    }
    keys.add(definition.key);
  }
  return definitions.slice(0, 40);
}

exports.updateSettings = async (req, res, next) => {
  const clientId = parseClientId(req);
  if (!clientId) return res.status(400).json({ message: 'Invalid client id.' });

  try {
    const current = await readSettings(clientId);
    const requestedProfile = normalizeProfileKey(
      req.body?.profile_key || current.profile_key,
    );
    const applyPreset = req.body?.apply_preset === true;
    const preset = getProfilePreset(requestedProfile);

    const baseColumns = applyPreset
      ? preset.displayColumns
      : current.display_columns;
    const baseDefinitions = applyPreset
      ? preset.fieldDefinitions
      : current.field_definitions;

    const displayColumns = normalizeColumns(
      req.body?.display_columns,
      baseColumns,
    );
    const fieldDefinitions = normalizeDefinitions(
      req.body?.field_definitions,
      baseDefinitions,
    );
    const defaultLocationId = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'default_location_id',
    )
      ? normalizeDefaultLocation(req.body.default_location_id)
      : current.default_location_id;
    const defaultUom = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'default_uom',
    )
      ? String(req.body.default_uom || '').trim() || null
      : applyPreset
        ? preset.defaultUom
        : current.default_uom;
    const importAliases = applyPreset
      ? preset.importAliases
      : current.import_aliases || {};

    const result = await pool.query(
      `INSERT INTO client_inventory_settings (
         client_id,
         profile_key,
         default_uom,
         default_location_id,
         display_columns,
         field_definitions,
         import_aliases
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
       ON CONFLICT (client_id)
       DO UPDATE SET
         profile_key = EXCLUDED.profile_key,
         default_uom = EXCLUDED.default_uom,
         default_location_id = EXCLUDED.default_location_id,
         display_columns = EXCLUDED.display_columns,
         field_definitions = EXCLUDED.field_definitions,
         import_aliases = EXCLUDED.import_aliases,
         updated_at = NOW()
       RETURNING *`,
      [
        clientId,
        requestedProfile,
        defaultUom,
        defaultLocationId,
        JSON.stringify(displayColumns),
        JSON.stringify(fieldDefinitions),
        JSON.stringify(importAliases),
      ],
    );

    return res.json({
      ...normalizeSettings(result.rows[0]),
      client_id: clientId,
      default_location_id: result.rows[0].default_location_id,
      import_templates: current.import_templates,
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'The selected default location does not exist.',
      });
    }
    if (error.message) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

exports.deleteImportTemplate = async (req, res, next) => {
  const clientId = parseClientId(req);
  const templateId = Number(req.params?.templateId);
  if (!clientId || !Number.isSafeInteger(templateId) || templateId < 1) {
    return res.status(400).json({ message: 'Invalid client or template id.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM client_import_templates
       WHERE id = $1 AND client_id = $2
       RETURNING id`,
      [templateId, clientId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Import template not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports._test = {
  normalizeColumns,
  normalizeDefinitions,
  normalizeDefaultLocation,
};
