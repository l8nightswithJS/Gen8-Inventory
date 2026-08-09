const { cleanText, normalizeProfile } = require('./_receivingDocument');

async function matchProducts(db, clientId, line) {
  const terms = [
    line?.part_number,
    line?.manufacturer_part_number,
    line?.vendor_item_number,
    line?.name,
    line?.description,
  ].map(cleanText).filter(Boolean);
  if (!terms.length) return [];
  const normalized = terms.map((term) => term.toLowerCase());

  const result = await db.query(
    `SELECT DISTINCT
       product.*,
       CASE
         WHEN lower(trim(product.part_number)) = ANY($2::text[]) THEN 100
         WHEN lower(trim(coalesce(product.manufacturer_part_number, ''))) = ANY($2::text[]) THEN 95
         WHEN lower(trim(coalesce(product.vendor_item_number, ''))) = ANY($2::text[]) THEN 95
         WHEN EXISTS (
           SELECT 1 FROM product_aliases AS alias
           WHERE alias.product_id = product.id
             AND lower(trim(alias.alias)) = ANY($2::text[])
         ) THEN 90
         ELSE 60
       END AS match_score
     FROM products AS product
     WHERE product.client_id = $1
       AND product.active = true
       AND (
         lower(trim(product.part_number)) = ANY($2::text[])
         OR lower(trim(coalesce(product.manufacturer_part_number, ''))) = ANY($2::text[])
         OR lower(trim(coalesce(product.vendor_item_number, ''))) = ANY($2::text[])
         OR EXISTS (
           SELECT 1 FROM product_aliases AS alias
           WHERE alias.product_id = product.id
             AND lower(trim(alias.alias)) = ANY($2::text[])
         )
         OR EXISTS (
           SELECT 1 FROM unnest($2::text[]) AS term
           WHERE lower(coalesce(product.name, '')) LIKE '%' || term || '%'
              OR lower(coalesce(product.description, '')) LIKE '%' || term || '%'
         )
       )
     ORDER BY match_score DESC, product.part_number
     LIMIT 8`,
    [clientId, normalized],
  );
  return result.rows;
}

async function resolveProduct(db, clientId, line) {
  const productId = Number(line?.product_id);
  if (Number.isSafeInteger(productId) && productId > 0) {
    const existing = await db.query(
      `SELECT * FROM products WHERE id = $1 AND client_id = $2 AND active = true LIMIT 1`,
      [productId, clientId],
    );
    if (!existing.rows[0]) {
      const error = new Error('Selected product does not exist for this client.');
      error.status = 400;
      throw error;
    }
    return existing.rows[0];
  }

  const raw = line?.product || {};
  const partNumber = cleanText(raw.part_number || line?.part_number);
  if (!partNumber) {
    const error = new Error('Every received line requires a confirmed product/part number.');
    error.status = 400;
    throw error;
  }

  const found = await db.query(
    `SELECT * FROM products
     WHERE client_id = $1 AND lower(trim(part_number)) = lower(trim($2))
     LIMIT 1`,
    [clientId, partNumber],
  );
  if (found.rows[0]) return found.rows[0];

  const result = await db.query(
    `INSERT INTO products (
       client_id, part_number, name, description, manufacturer,
       manufacturer_part_number, vendor_item_number, profile_key,
       default_uom, attributes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
     RETURNING *`,
    [
      clientId,
      partNumber,
      cleanText(raw.name || line?.name),
      cleanText(raw.description || line?.description),
      cleanText(raw.manufacturer || line?.manufacturer),
      cleanText(raw.manufacturer_part_number || line?.manufacturer_part_number),
      cleanText(raw.vendor_item_number || line?.vendor_item_number),
      normalizeProfile(raw.profile_key || line?.profile_hint),
      cleanText(raw.default_uom || line?.uom),
      JSON.stringify(raw.attributes && typeof raw.attributes === 'object' ? raw.attributes : {}),
    ],
  );
  return result.rows[0];
}

async function saveAliases(db, clientId, productId, supplierName, aliases) {
  for (const alias of (Array.isArray(aliases) ? aliases : []).map(cleanText).filter(Boolean)) {
    await db.query(
      `INSERT INTO product_aliases (client_id, product_id, alias, supplier_name)
       SELECT $1,$2,$3,$4
       WHERE NOT EXISTS (
         SELECT 1 FROM product_aliases
         WHERE client_id = $1 AND lower(trim(alias)) = lower(trim($3))
       )`,
      [clientId, productId, alias, cleanText(supplierName)],
    );
  }
}

module.exports = { matchProducts, resolveProduct, saveAliases };
