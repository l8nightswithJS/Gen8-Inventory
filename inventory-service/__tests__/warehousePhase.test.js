const {
  normalizeStrategy,
} = require('../controllers/warehouseImportController')._test;
const {
  parseQuantity,
} = require('../controllers/warehouseOperationsController')._test;
const {
  isCombinedLegacyLocation,
} = require('../controllers/masterWarehouseController')._test;
const {
  normalizeNonNegativeDecimal,
} = require('../controllers/_itemContract');

describe('warehouse import strategy', () => {
  test('defaults all new imports to staging', () => {
    expect(normalizeStrategy()).toBe('staging');
  });

  test('accepts supported placement strategies', () => {
    expect(normalizeStrategy('file')).toBe('file');
    expect(normalizeStrategy('selected')).toBe('selected');
  });

  test('rejects unknown placement strategies', () => {
    expect(() => normalizeStrategy('guess')).toThrow(/staging, file, or selected/i);
  });
});

describe('warehouse quantity validation', () => {
  test('accepts decimal quantities', () => {
    expect(parseQuantity('27.4', 'remaining')).toBe(27.4);
  });

  test('accepts formatted core decimals from spreadsheets', () => {
    expect(normalizeNonNegativeDecimal('2,000.00', 'reorder_level')).toBe(2000);
  });

  test('rejects negative remaining quantities', () => {
    expect(() => parseQuantity('-1', 'remaining')).toThrow(/non-negative/i);
  });
});

describe('legacy location detection', () => {
  test.each(['A1,B4', 'A1/B5', 'A1;B5'])(
    'flags combined legacy location %s',
    (code) => expect(isCombinedLegacyLocation(code)).toBe(true),
  );

  test('does not flag structured warehouse locations', () => {
    expect(isCombinedLegacyLocation('RES-A-S04')).toBe(false);
    expect(isCombinedLegacyLocation('RA-S02-B01')).toBe(false);
  });
});
