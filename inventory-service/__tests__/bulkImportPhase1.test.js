const {
  mapImportedRow,
  parseImportedLocation,
  parseImportedQuantity,
} = require('../controllers/bulkImportController')._test;

describe('phase 1 bulk-import mapping', () => {
  test('maps generic vendor barcode separately from internal barcode', () => {
    const mapped = mapImportedRow({
      'Part Number': 'ABC-100',
      Barcode: 'VENDOR-55',
      'Internal Barcode': 'BIN-0001',
      UOM: 'lb',
      'On Hand': 12.5,
      Location: 'A4',
    });

    expect(mapped).toMatchObject({
      part_number: 'ABC-100',
      vendor_barcode: 'VENDOR-55',
      barcode: 'BIN-0001',
      uom: 'lb',
      total_quantity: 12.5,
      location: 'A4',
    });
  });

  test('recognizes multiple physical locations as allocation review', () => {
    expect(parseImportedLocation('A1, B4 / C2')).toEqual({
      source: 'A1, B4 / C2',
      codes: ['A1', 'B4', 'C2'],
      requiresAllocation: true,
    });
  });

  test('accepts decimal quantities up to three places', () => {
    expect(parseImportedQuantity('10.375')).toEqual({
      quantity: 10.375,
      warning: null,
      issueType: null,
    });
  });

  test('keeps ambiguous quantities out of official inventory', () => {
    const result = parseImportedQuantity('118LBS/540LBS');
    expect(result.quantity).toBeNull();
    expect(result.issueType).toBe('ambiguous_quantity');
    expect(result.warning).toMatch(/needs review/i);
  });

  test('imports approximate quantities but marks them for review', () => {
    expect(parseImportedQuantity('1000+')).toEqual({
      quantity: 1000,
      warning: 'Approximate quantity "1000+" was imported as 1000.',
      issueType: 'approximate_quantity',
    });
  });
});
