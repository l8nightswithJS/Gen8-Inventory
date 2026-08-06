const {
  isBlankOrNa,
  mapImportedRow,
  normalizeMappingTarget,
} = require('../controllers/bulkImportController')._test;
const {
  getProfilePreset,
  normalizeSettings,
} = require('../../packages/inventory-profiles');

describe('phase 2 GenMark import mapping', () => {
  const preset = getProfilePreset('genmark_components');
  const settings = normalizeSettings({
    profile_key: 'genmark_components',
    display_columns: preset.displayColumns,
    field_definitions: preset.fieldDefinitions,
    import_aliases: preset.importAliases,
  });

  test('maps the GenMark Inventory Master headers', () => {
    const mapped = mapImportedRow(
      {
        'GenMark Item #': 'RM005631',
        'Mfg Material #': 'MFG-100',
        'Vendor Item #': 'VEN-200',
        Description: 'Lower Shroud',
        Category: 'Molded Component',
        Unit: 'ea',
        'Current Qty': '6360',
        'Usage / Assembly': '1',
        'Weekly Demand': '2000',
        'Weeks on Hand': '3.18',
        'Minimum Qty': '2000',
        'Reorder Level': '4000',
        'Reorder Qty': '6000',
        'Target Qty': '8000',
        'Suggested Reorder': '0',
        'Stock Status': 'In Stock',
        Priority: 'Normal',
        'Batch #': '10300617',
        'Lot #': '0000371630',
        Notes: 'Example',
      },
      {},
      settings,
    );

    expect(mapped).toMatchObject({
      part_number: 'RM005631',
      manufacturer_part_number: 'MFG-100',
      vendor_item_number: 'VEN-200',
      description: 'Lower Shroud',
      category: 'Molded Component',
      uom: 'ea',
      total_quantity: '6360',
      usage_per_assembly: '1',
      weekly_demand: '2000',
      minimum_quantity: '2000',
      reorder_level: '4000',
      reorder_quantity: '6000',
      target_quantity: '8000',
      batch_number: '10300617',
      lot_number: '0000371630',
      notes: 'Example',
    });

    expect(mapped.weeks_on_hand).toBeUndefined();
    expect(mapped.suggested_reorder).toBeUndefined();
    expect(mapped.stock_status).toBeUndefined();
    expect(mapped.priority).toBeUndefined();
  });

  test('preserves formatted leading-zero lot numbers as text', () => {
    const mapped = mapImportedRow(
      { 'GenMark Item #': 'RM005765', 'Lot #': '0000366712' },
      {},
      settings,
    );
    expect(mapped.lot_number).toBe('0000366712');
  });

  test('recognizes N/A as unavailable for fallback logic', () => {
    expect(isBlankOrNa('N/A')).toBe(true);
    expect(isBlankOrNa(' n/a ')).toBe(true);
    expect(isBlankOrNa('S-15889')).toBe(false);
  });

  test('normalizes UI mapping aliases and ignore targets', () => {
    expect(normalizeMappingTarget('inventory_location')).toBe('location');
    expect(normalizeMappingTarget('on_hand')).toBe('total_quantity');
    expect(normalizeMappingTarget('ignore')).toBeNull();
    expect(normalizeMappingTarget(null)).toBeNull();
  });

  test('explicit mapping overrides a profile alias', () => {
    const mapped = mapImportedRow(
      { Description: 'Lower Shroud' },
      { Description: 'name' },
      settings,
    );
    expect(mapped.name).toBe('Lower Shroud');
    expect(mapped.description).toBeUndefined();
  });
});
