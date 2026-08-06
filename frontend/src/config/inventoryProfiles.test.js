import {
  buildColumnMapping,
  detectBestSheet,
  filterMappedDataRows,
  matrixToObjects,
} from './inventoryProfiles';

const settings = {
  profile_key: 'genmark_components',
  field_definitions: [
    {
      key: 'manufacturer_part_number',
      label: 'Manufacturer Part Number',
      type: 'text',
    },
    { key: 'vendor_item_number', label: 'Vendor Item Number', type: 'text' },
    { key: 'minimum_quantity', label: 'Minimum Quantity', type: 'decimal' },
  ],
};

describe('GenMark workbook detection', () => {
  const inventoryHeaders = [
    'GenMark Item #',
    'Mfg Material #',
    'Vendor Item #',
    'Description',
    'Category',
    'Unit',
    'Current Qty',
    'Usage / Assembly',
    'Weekly Demand',
    'Weeks on Hand',
    'Minimum Qty',
    'Reorder Level',
    'Reorder Qty',
    'Target Qty',
    'Suggested Reorder',
    'Stock Status',
    'Priority',
    'Batch #',
    'Lot #',
    'Notes',
  ];

  const sheets = {
    Assumptions: [
      ['GenMark Inventory Assumptions'],
      ['Weekly Assembly Volume', '2000'],
    ],
    'Inventory Master': [
      ['GenMark Inventory Master'],
      ['Last Updated', '2026-08-06'],
      inventoryHeaders,
      [
        'RM005631',
        'MFG-100',
        'VEN-100',
        'Lower Shroud',
        'Molded Component',
        'ea',
        '6360',
        '1',
        '2000',
        '3.18',
        '2000',
        '4000',
        '6000',
        '8000',
        '0',
        'In Stock',
        'Normal',
        '10300617',
        '0000371630',
        '',
      ],
      [
        'N/A',
        '',
        'S-15889',
        'Clear Bag',
        'Packaging',
        'ea',
        '112',
        '0.01',
        '20',
        '5.6',
        '40',
        '80',
        '100',
        '120',
        '0',
        'In Stock',
        'Normal',
        '',
        '',
        '',
      ],
    ],
    'Reorder Report': [['Reorder Report'], ['No items to reorder']],
    Dashboard: [['Inventory Dashboard'], ['Total Items', '10']],
  };

  test('selects Inventory Master and header row 3', () => {
    expect(detectBestSheet(sheets, settings)).toMatchObject({
      sheetName: 'Inventory Master',
      headerIndex: 2,
    });
  });

  test('maps source columns and ignores spreadsheet-derived fields', () => {
    const mapping = buildColumnMapping(inventoryHeaders, settings);

    expect(mapping['GenMark Item #']).toBe('part_number');
    expect(mapping['Current Qty']).toBe('total_quantity');
    expect(mapping['Minimum Qty']).toBe('minimum_quantity');
    expect(mapping['Lot #']).toBe('lot_number');
    expect(mapping['Weeks on Hand']).toBeNull();
    expect(mapping['Suggested Reorder']).toBeNull();
    expect(mapping['Stock Status']).toBeNull();
    expect(mapping.Priority).toBeNull();
  });

  test('preserves leading-zero lot text and returns only data rows', () => {
    const mapping = buildColumnMapping(inventoryHeaders, settings);
    const rows = filterMappedDataRows(
      matrixToObjects(sheets['Inventory Master'], 2),
      mapping,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]['Lot #']).toBe('0000371630');
    expect(rows[1]['Vendor Item #']).toBe('S-15889');
  });
});
