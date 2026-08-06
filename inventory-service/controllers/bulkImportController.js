const pool = require('../db/pool');
const {
  ItemContractError,
  normalizeUpdateItemPayload,
} = require('./_itemContract');
const {
  loadClientSettings,
  validateProfileAttributes,
} = require('./_profileSettings');

const IMPORT_ALIASES = {
  part_number: ['part', 'part_number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot_number', 'lot #', 'lot#', 'batch', 'batch_number'],
  description: ['desc', 'description', 'item_description'],
  name: ['name', 'item_name', 'product_name'],
  vendor_barcode: [
    'barcode',
    'bar code',
    'barcodes',
    'vendor barcode',
    'vendor_barcode',
    'manufacturer barcode',
    'manufacturer_barcode',
    'supplier barcode',
    'supplier_barcode',
    'upc',
    'gtin',
  ],
  barcode: [
    'internal barcode',
    'internal_barcode',
    'container barcode',
    'container_barcode',
    'inventory barcode',
    'inventory_barcode',
  ],
  uom: ['uom', 'unit', 'units', 'unit of measure', 'unit_of_measure'],
  total_quantity: [
    'quantity',
    'on hand',
    'on_hand',
    'current qty',
    'current quantity',
    'qty in stock',
    'qty_in_stock',
    'stock',
    'total quantity',
    'total_quantity',
  ],
  location: [
    'location',
    'locations',
    'bin',
    'bin location',
    'bin_location',
    'shelf',
    'storage location',
    'storage_location',
  ],
  reorder_level: ['reorder_level', 'reorder level', 'reorder point', 'reorder_lvl', 'min_stock'],
  low_stock_threshold: [
    'low_stock_threshold',
    'low stock threshold',
    'low_stock',
  ],
};

function normalizeKey(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

function isBlankOrNa(value) {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  return !text || /^n\/?a$/i.test(text);
}

function buildAliasLookup(settings = {}) {
  const aliases = new Map();
  for (const [canonical, sourceAliases] of Object.entries(IMPORT_ALIASES)) {
    aliases.set(normalizeKey(canonical), canonical);
    for (const alias of sourceAliases) {
      aliases.set(normalizeKey(alias), canonical);
    }
  }

  for (const [source, target] of Object.entries(settings.import_aliases || {})) {
    aliases.set(normalizeKey(source), target == null ? null : normalizeKey(target));
  }
  return aliases;
}

function normalizeMappingTarget(target) {
  if (target === null || target === undefined) return null;
  const normalized = normalizeKey(target);
  if (!normalized || normalized === 'ignore' || normalized === '__ignore__') {
    return null;
  }
  if (normalized === 'inventory_location') return 'location';
  if (normalized === 'on_hand') return 'total_quantity';
  return normalized;
}

function mapImportedRow(rawRow, explicitMapping = {}, settings = {}) {
  const mapped = {};
  const aliasLookup = buildAliasLookup(settings);

  for (const [rawKey, value] of Object.entries(rawRow || {})) {
    const cleanedKey = String(rawKey).trim();
    const explicitTarget = Object.prototype.hasOwnProperty.call(
      explicitMapping,
      rawKey,
    )
      ? explicitMapping[rawKey]
      : Object.prototype.hasOwnProperty.call(explicitMapping, cleanedKey)
        ? explicitMapping[cleanedKey]
        : undefined;

    const target =
      explicitTarget !== undefined
        ? normalizeMappingTarget(explicitTarget)
        : normalizeMappingTarget(aliasLookup.get(normalizeKey(cleanedKey))) ||
          cleanedKey;

    if (!target) continue;
    mapped[target] = value;
  }

  return mapped;
}

function hasSupportedPrecision(value) {
  return Math.abs(value - Math.round(value * 1000) / 1000) < 1e-9;
}

function parseImportedQuantity(value) {
  if (value === undefined || value === null || value === '') {
    return { quantity: null, warning: null, issueType: null };
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value) && value >= 0 && hasSupportedPrecision(value)) {
      return { quantity: value, warning: null, issueType: null };
    }
    return {
      quantity: null,
      warning:
        'On Hand must be a non-negative number with no more than 3 decimal places.',
      issueType: 'invalid_quantity',
    };
  }

  const text = String(value).trim();
  if (!text) return { quantity: null, warning: null, issueType: null };

  const exactNumber = /^\d+(?:\.\d{1,3})?$/;
  if (exactNumber.test(text)) {
    return { quantity: Number(text), warning: null, issueType: null };
  }

  const thousandsNumber = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?$/;
  if (thousandsNumber.test(text)) {
    return {
      quantity: Number(text.replace(/,/g, '')),
      warning: null,
      issueType: null,
    };
  }

  const approximateNumber = /^(\d+(?:\.\d{1,3})?)\+$/;
  const approximateMatch = text.match(approximateNumber);
  if (approximateMatch) {
    return {
      quantity: Number(approximateMatch[1]),
      warning: `Approximate quantity "${text}" was imported as ${approximateMatch[1]}.`,
      issueType: 'approximate_quantity',
    };
  }

  return {
    quantity: null,
    warning: `On Hand value "${text}" is ambiguous and needs review.`,
    issueType: 'ambiguous_quantity',
  };
}

function normalizeLocation(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseImportedLocation(value) {
  const source = normalizeLocation(value);
  if (!source) return { source, codes: [], requiresAllocation: false };

  const codes = source
    .split(/[,;/\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    source,
    codes,
    requiresAllocation: codes.length > 1,
  };
}

function createReviewIssue(type, field, sourceValue, message) {
  return {
    type,
    field,
    source_value:
      sourceValue === undefined || sourceValue === null
        ? null
        : String(sourceValue),
    message,
  };
}

function buildInsert(coreData, attributes, clientId, reviewIssues) {
  const reviewStatus = reviewIssues.length > 0 ? 'needs_review' : 'clear';
  const columns = [
    'client_id',
    ...Object.keys(coreData),
    'attributes',
    'review_status',
    'review_issues',
  ];
  const values = [
    clientId,
    ...Object.values(coreData),
    JSON.stringify(attributes),
    reviewStatus,
    JSON.stringify(reviewIssues),
  ];
  const placeholders = values.map((_, index) => `$${index + 1}`);
  placeholders[placeholders.length - 3] += '::jsonb';
  placeholders[placeholders.length - 1] += '::jsonb';

  return {
    text: `INSERT INTO items (${columns
      .map((column) => `"${String(column).replace(/"/g, '""')}"`)
      .join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    values,
  };
}

async function findOrCreateLocation(dbClient, cache, rawCode) {
  const code = normalizeLocation(rawCode);
  if (!code) throw new Error('A location code is required.');

  const cacheKey = code.toLowerCase();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let result = await dbClient.query(
    'SELECT id FROM locations WHERE lower(code) = lower($1) LIMIT 1',
    [code],
  );

  if (result.rows.length === 0) {
    result = await dbClient.query(
      `INSERT INTO locations (code, description)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [code, 'Created automatically during bulk import'],
    );

    if (result.rows.length === 0) {
      result = await dbClient.query(
        'SELECT id FROM locations WHERE lower(code) = lower($1) LIMIT 1',
        [code],
      );
    }
  }

  const locationId = result.rows[0]?.id;
  if (!locationId) {
    throw new Error(`Unable to resolve imported location "${code}".`);
  }

  cache.set(cacheKey, locationId);
  return locationId;
}

async function validateLocationId(dbClient, locationId) {
  if (!locationId) return null;
  const result = await dbClient.query(
    'SELECT id FROM locations WHERE id = $1 LIMIT 1',
    [locationId],
  );
  if (result.rows.length === 0) {
    throw new ItemContractError('The selected default location does not exist.');
  }
  return Number(result.rows[0].id);
}

async function saveImportTemplate(dbClient, clientId, template, fallbackLocationId) {
  if (!template || template.save !== true) return null;

  const name = String(template.name || '').trim();
  if (!name) {
    throw new ItemContractError('An import template name is required.');
  }

  const isDefault = template.is_default !== false;
  if (isDefault) {
    await dbClient.query(
      'UPDATE client_import_templates SET is_default = false WHERE client_id = $1',
      [clientId],
    );
  }

  const result = await dbClient.query(
    `INSERT INTO client_import_templates (
       client_id,
       name,
       sheet_name,
       header_row,
       column_mapping,
       default_location_id,
       is_default
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (client_id, name)
     DO UPDATE SET
       sheet_name = EXCLUDED.sheet_name,
       header_row = EXCLUDED.header_row,
       column_mapping = EXCLUDED.column_mapping,
       default_location_id = EXCLUDED.default_location_id,
       is_default = EXCLUDED.is_default,
       updated_at = NOW()
     RETURNING *`,
    [
      clientId,
      name,
      String(template.sheet_name || '').trim() || null,
      Number.isSafeInteger(Number(template.header_row))
        ? Number(template.header_row)
        : null,
      JSON.stringify(template.column_mapping || {}),
      template.default_location_id || fallbackLocationId || null,
      isDefault,
    ],
  );

  return result.rows[0];
}

function sendUniqueConflict(error, res) {
  if (error?.code !== '23505') return false;

  const rawConstraint = String(error.constraint || 'unknown_unique_constraint');
  const constraint = /^[a-z0-9_]+$/i.test(rawConstraint)
    ? rawConstraint
    : 'unknown_unique_constraint';

  res.status(409).json({
    code: 'UNIQUE_CONFLICT',
    constraint,
    message: constraint.toLowerCase().includes('barcode')
      ? 'Import failed. An internal inventory barcode is already assigned to another record.'
      : `Import failed because ${constraint} requires a unique value.`,
  });
  return true;
}

exports.bulkImportItems = async (req, res, next) => {
  const clientId = Number(req.body?.client_id);
  const items = req.body?.items;
  const explicitMapping = req.body?.column_mapping || {};

  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    return res.status(400).json({ message: 'client_id must be a positive integer.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items must be a non-empty array.' });
  }

  let dbClient = null;
  const locationCache = new Map();
  const warnings = [];
  let needsReviewCount = 0;

  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const settings = await loadClientSettings(clientId, dbClient);
    const requestedDefaultLocation = Number(req.body?.default_location_id);
    const defaultLocationId = await validateLocationId(
      dbClient,
      Number.isSafeInteger(requestedDefaultLocation) && requestedDefaultLocation > 0
        ? requestedDefaultLocation
        : settings.default_location_id,
    );

    for (let index = 0; index < items.length; index += 1) {
      const spreadsheetRow = Number(req.body?.header_row || 1) + index + 1;
      const mapped = mapImportedRow(
        items[index],
        explicitMapping,
        settings,
      );

      if (isBlankOrNa(mapped.part_number) && !isBlankOrNa(mapped.vendor_item_number)) {
        mapped.part_number = mapped.vendor_item_number;
        warnings.push({
          row: spreadsheetRow,
          field: 'Part Number',
          value: mapped.vendor_item_number,
          message:
            'Part Number was missing or N/A, so Vendor Item Number was used as the inventory part number.',
        });
      }

      if (!mapped.uom && settings.default_uom) mapped.uom = settings.default_uom;
      if (isBlankOrNa(mapped.lot_number)) mapped.lot_number = null;
      if (isBlankOrNa(mapped.batch_number)) mapped.batch_number = null;

      const rawQuantity = mapped.total_quantity;
      const rawLocation = mapped.location;
      delete mapped.total_quantity;
      delete mapped.location;

      const parsedQuantity = parseImportedQuantity(rawQuantity);
      const parsedLocation = parseImportedLocation(rawLocation);
      const reviewIssues = [];

      if (parsedQuantity.warning) {
        warnings.push({
          row: spreadsheetRow,
          field: 'On Hand',
          value: rawQuantity,
          message: parsedQuantity.warning,
        });
        reviewIssues.push(
          createReviewIssue(
            parsedQuantity.issueType || 'quantity_review',
            'quantity',
            rawQuantity,
            parsedQuantity.warning,
          ),
        );
      }

      const quantityWasProvided =
        rawQuantity !== undefined && rawQuantity !== null && rawQuantity !== '';

      if (!quantityWasProvided && parsedLocation.source) {
        reviewIssues.push(
          createReviewIssue(
            'missing_quantity',
            'quantity',
            rawQuantity,
            'A location was provided without an On Hand quantity.',
          ),
        );
      }

      if (parsedLocation.requiresAllocation) {
        reviewIssues.push(
          createReviewIssue(
            'location_allocation',
            'location',
            parsedLocation.source,
            'Multiple locations were supplied. Quantity must be allocated to individual locations.',
          ),
        );
      }

      if (
        parsedQuantity.quantity !== null &&
        parsedLocation.codes.length === 0 &&
        !defaultLocationId
      ) {
        throw new ItemContractError(
          `Row ${spreadsheetRow}: a physical location is required for Current Qty. Select a default import location or map a Location column.`,
        );
      }

      let normalized;
      try {
        normalized = normalizeUpdateItemPayload(mapped);
      } catch (error) {
        if (error instanceof ItemContractError) {
          throw new ItemContractError(`Row ${spreadsheetRow}: ${error.message}`);
        }
        throw error;
      }

      const { coreData } = normalized;
      let { attributes } = normalized;
      if (!coreData.part_number) {
        throw new ItemContractError(
          `Row ${spreadsheetRow}: no mappable part number was found.`,
        );
      }

      try {
        attributes = validateProfileAttributes(attributes, settings);
      } catch (error) {
        throw new ItemContractError(`Row ${spreadsheetRow}: ${error.message}`);
      }

      const insert = buildInsert(
        coreData,
        attributes,
        clientId,
        reviewIssues,
      );
      const itemResult = await dbClient.query(insert.text, insert.values);
      const itemId = itemResult.rows[0].id;

      const canCreateImportedLocationBalance =
        parsedQuantity.quantity !== null &&
        parsedLocation.codes.length === 1 &&
        !parsedLocation.requiresAllocation;
      const canCreateDefaultLocationBalance =
        parsedQuantity.quantity !== null &&
        parsedLocation.codes.length === 0 &&
        defaultLocationId;

      if (canCreateImportedLocationBalance || canCreateDefaultLocationBalance) {
        const locationId = canCreateImportedLocationBalance
          ? await findOrCreateLocation(
              dbClient,
              locationCache,
              parsedLocation.codes[0],
            )
          : defaultLocationId;

        await dbClient.query(
          `INSERT INTO inventory (item_id, location_id, quantity)
           VALUES ($1, $2, $3)`,
          [itemId, locationId, parsedQuantity.quantity],
        );
      }

      if (reviewIssues.length > 0) needsReviewCount += 1;
    }

    const savedTemplate = await saveImportTemplate(
      dbClient,
      clientId,
      req.body?.template,
      defaultLocationId,
    );

    if (
      defaultLocationId &&
      Number(settings.default_location_id) !== Number(defaultLocationId) &&
      req.body?.save_default_location === true
    ) {
      await dbClient.query(
        `UPDATE client_inventory_settings
         SET default_location_id = $2, updated_at = NOW()
         WHERE client_id = $1`,
        [clientId, defaultLocationId],
      );
    }

    await dbClient.query('COMMIT');

    return res.status(201).json({
      message: 'Bulk import successful',
      successCount: items.length,
      needsReviewCount,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 50),
      savedTemplate,
    });
  } catch (error) {
    if (dbClient) {
      await dbClient.query('ROLLBACK').catch(() => undefined);
    }

    if (error instanceof ItemContractError) {
      return res.status(error.status || 400).json({ message: error.message });
    }
    if (sendUniqueConflict(error, res)) return;

    console.error('Bulk import error:', error);
    return next(error);
  } finally {
    dbClient?.release();
  }
};

module.exports._test = {
  buildAliasLookup,
  isBlankOrNa,
  mapImportedRow,
  normalizeLocation,
  normalizeMappingTarget,
  parseImportedLocation,
  parseImportedQuantity,
};
