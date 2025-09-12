// inventory-service/scripts/seed-locations.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../db/pool');

// ===============================================================
// CONFIGURE YOUR LOCATIONS HERE
// ===============================================================

// You can customize these values to match your warehouse layout.
const RACKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const SHELVES_PER_RACK = 5;
const BINS_PER_SHELF = 4;

// ===============================================================

async function seedLocations() {
  const locationsToInsert = [];

  // Generate all location codes based on the configuration above
  for (const rack of RACKS) {
    for (let shelf = 1; shelf <= SHELVES_PER_RACK; shelf++) {
      for (let bin = 1; bin <= BINS_PER_SHELF; bin++) {
        const locationCode = `${rack}-${shelf}-${bin}`;
        locationsToInsert.push({
          code: locationCode,
          description: `Rack ${rack}, Shelf ${shelf}, Bin ${bin}`,
        });
      }
    }
  }

  console.log(
    `✅ Generated ${locationsToInsert.length} global location records.`,
  );

  if (locationsToInsert.length === 0) {
    console.log('No locations to insert. Exiting.');
    return;
  }

  const client = await pool.connect();
  console.log('Database connection established.');

  try {
    // Using a bulk insert for efficiency
    const values = locationsToInsert
      .map((loc) => `('${loc.code}', '${loc.description.replace(/'/g, "''")}')`)
      .join(',');

    // ON CONFLICT (code) DO NOTHING makes the script safe to re-run.
    // If a location with the same code already exists, it will be skipped.
    const query = `
      INSERT INTO locations (code, description)
      VALUES ${values}
      ON CONFLICT (code) DO NOTHING;
    `;

    const result = await client.query(query);
    console.log(`✅ Successfully inserted ${result.rowCount} new locations.`);
    if (result.rowCount < locationsToInsert.length) {
      console.log(
        `   - Skipped ${
          locationsToInsert.length - result.rowCount
        } locations that already existed.`,
      );
    }
  } catch (err) {
    console.error('❌ Error during database insertion:', err);
  } finally {
    client.release();
    console.log('Database connection released.');
  }
}

seedLocations();
