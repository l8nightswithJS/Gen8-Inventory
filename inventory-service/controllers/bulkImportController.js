const pool = require('../db/pool');
const {
  ItemContractError,
  normalizeUpdateItemPayload,
} = require('./_itemContract');

const IMPORT_ALIASES = {
  part_number: ['part', 'part_number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot_number', 'lot #', 'lot#', 'batch', 'batch_number'],
  description: ['desc', 'description', 'item_description'],
  name: ['name', 'item_name', 'product_name'],
  barcode: ['barcode', 'bar code', 'upc', 'barcodes'],
  total_quantity: [
    'quantity',
    'on hand',
    'on_hand',
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
    'shelf',
    'storage location',
  ],
  reorder_level: ['reorder_level', 'reorder point', 'reorder_lvl', 'min_stock'],
  low_stock_threshold: ['low_stock_threshold', 'low_stock'],
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

const REVERSE_IMPORT_ALIASES = new Map();
for (const [canonical, aliases] of Object.entries(IMPORT_ALIASES)) {
  REVERSE_IMPORT_ALIASES.set(normalizeKey(canonical), canonical);
  for (const alias of aliases) {
    REVERSE_IMPORT_ALIASES.set(normalizeKey(alias), canonical);
  }
}

function mapImportedRow(rawRow) {
  const mapped = {};

  for (const [rawKey, value] of Object.entries(rawRow || {})) {
    const cleanedKey = String(rawKey).trim();
    const canonical = REVERSE_IMPORT_ALIASES.get(normalizeKey(cleanedKey));
    mapped[canonical || cleanedKey] = value;
  }

  return mapped;
}

function parseImportedQuantity(value) {
  if (value === undefined || value === null || value === '') {
    return { quantity: null, warning: null };
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value) && value >= 0) {
      return { quantity: value, warning: null };
    }
    return {
      quantity: null,
      warning: 'On Hand must be a non-negative number.',
    };
  }

  const text = String(value).trim();
  if (!text) return { quantity: null, warning: null };

  const exactNumber = /^\d+(?:\.\d+)?$/;
  if (exactNumber.test(text)) {
    return { quantity: Number(text), warning: null };
  }

  const thousandsNumber = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
  if (thousandsNumber.test(text)) {
    return { quantity: Number(text.replace(/,/g, '')), warning: null };
  }

  const approximateNumber = /^(\d+(?:\.\d+)?)\+$/;
  const approximateMatch = text.match(approximateNumber);
  if (approximateMatch) {
    return {
      quantity: Number(approximateMatch[1]),
      warning: `Approximate quantity "${text}" was imported as ${approximateMatch[1]}.`,
    };
  }

  return {
    quantity: null,
    warning: `On Hand value "${text}" is ambiguous and needs review.`,
  };
}

function normalizeLocation(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function buildInsert(coreData, attributes, clientId) {
  const columns = ['client_id', ...Object.keys(coreData), 'attributes'];
  const values = [clientId, ...Object.values(coreData), JSON.stringify(attributes)];
  const placeholders = values.map((_, index) => `$${index + 1}`);
  placeholders[placeholders.length - 1] += '::jsonb';

  return {
    text: `INSERT INTO items (${columns
      .map((column) => `"${String(column).replace(/"/g, '""')}"`)
      .join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    values,
  };
}

async function findOrCreateLocation(dbClient, cache, rawCode) {
  const code = normalizeLocation(rawCode) || 'Imported';
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
      ? 'Import failed. Each inventory record must have a unique barcode.'
      : `Import failed because ${constraint} requires a unique value.`,
  });
  return true;
}

exports.bulkImportItems = async (req, res, next) => {
  const clientId = Number(req.body?.client_id);
  const items = req.body?.items;

  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    return res.status(400).json({ message: 'client_id must be a positive integer.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items must be a non-empty array.' });
  }

  let dbClient = null;
  const locationCache = new Map();
  const warnings = [];

  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    for (let index = 0; index < items.length; index += 1) {
      const spreadsheetRow = index + 2;
      const mapped = mapImportedRow(items[index]);
      const rawQuantity = mapped.total_quantity;
      const rawLocation = mapped.location;

      delete mapped.total_quantity;
      delete mapped.location;

      const locationText = normalizeLocation(rawLocation);
      if (locationText) {
        // Keep the human-readable source location visible in the item card.
        mapped.Location = locationText;
      }

      const parsedQuantity = parseImportedQuantity(rawQuantity);
      if (parsedQuantity.warning) {
        warnings.push({
          row: spreadsheetRow,
          field: 'On Hand',
          value: rawQuantity,
          message: parsedQuantity.warning,
        });
      }

      if (
        parsedQuantity.quantity === null &&
        rawQuantity !== undefined &&
        rawQuantity !== ''
      ) {
        mapped['On Hand (Review)'] = rawQuantity;
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

      const { coreData, attributes } = normalized;
      if (!coreData.part_number) {
        throw new ItemContractError(
          `Row ${spreadsheetRow}: no mappable part number was found.`,
        );
      }

      const insert = buildInsert(coreData, attributes, clientId);
      const itemResult = await dbClient.query(insert.text, insert.values);
      const itemId = itemResult.rows[0].id;

      if (parsedQuantity.quantity !== null) {
        const locationId = await findOrCreateLocation(
          dbClient,
          locationCache,
          locationText,
        );

        await dbClient.query(
          `INSERT INTO inventory (item_id, location_id, quantity)
           VALUES ($1, $2, $3)`,
          [itemId, locationId, parsedQuantity.quantity],
        );
      }
    }

    await dbClient.query('COMMIT');

    return res.status(201).json({
      message: 'Bulk import successful',
      successCount: items.length,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 50),
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
  mapImportedRow,
  parseImportedQuantity,
  normalizeLocation,
};
