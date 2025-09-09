// inventory-service/scripts/migrate-inventory.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
console.log('DATABASE_URL loaded as:', process.env.DATABASE_URL);
const pool = require('../db/pool');
const { qtyFrom } = require('../controllers/_stockLogic');

async function migrate() {
  const client = await pool.connect();
  console.log('Database connection established.');

  try {
    await client.query('BEGIN'); // Start a database transaction

    console.log('Fetching all items and locations...');
    const itemsResult = await client.query(
      'SELECT id, client_id, attributes FROM items',
    );
    const locationsResult = await client.query(
      'SELECT id, client_id, code FROM locations',
    );

    const allItems = itemsResult.rows;
    const allLocations = locationsResult.rows;

    // Create a map for quick lookup of location IDs by their code and client
    const locationMap = new Map();
    for (const loc of allLocations) {
      const key = `${loc.client_id}_${String(loc.code).trim().toLowerCase()}`;
      locationMap.set(key, loc.id);
    }

    console.log(`Processing ${allItems.length} items...`);
    let recordsUpserted = 0;

    for (const item of allItems) {
      const attributes = item.attributes || {};

      const quantity = qtyFrom(attributes);
      const locationCode = (attributes.location || 'unspecified')
        .trim()
        .toLowerCase();
      const clientLocationKey = `${item.client_id}_${locationCode}`;
      const locationId = locationMap.get(clientLocationKey);

      // Only proceed if we have a valid quantity and location
      if (quantity !== null && locationId) {
        // This is the "UPSERT" command. It's atomic and safe.
        await client.query(
          `INSERT INTO inventory (item_id, location_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (item_id, location_id)
           DO UPDATE SET quantity = EXCLUDED.quantity`,
          [item.id, locationId, quantity],
        );

        // Now, clean the migrated keys from the attributes JSON
        const newAttributes = { ...attributes };
        delete newAttributes.quantity;
        delete newAttributes.on_hand;
        delete newAttributes.qty_in_stock;
        delete newAttributes.stock;
        delete newAttributes.location;

        await client.query('UPDATE items SET attributes = $1 WHERE id = $2', [
          newAttributes,
          item.id,
        ]);
        recordsUpserted++;
      }
    }

    await client.query('COMMIT'); // Finalize the transaction
    console.log('✅ Migration successful!');
    console.log(
      `   - Synced/Upserted ${recordsUpserted} records into the 'inventory' table.`,
    );
    console.log(
      "   - Cleaned 'quantity' and 'location' from 'items.attributes'.",
    );
  } catch (err) {
    await client.query('ROLLBACK'); // Abort transaction on any error
    console.error('❌ Migration failed. All changes have been rolled back.');
    console.error(err);
  } finally {
    client.release();
    console.log('Database connection released.');
  }
}

migrate().catch(console.error);
