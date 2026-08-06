const {
  normalizeUom,
  parseNonNegativeQuantity,
  parseSignedQuantity,
} = require('../controllers/inventoryAdjustmentController')._test;

describe('phase 1 inventory quantity validation', () => {
  test('accepts signed decimal adjustments', () => {
    expect(parseSignedQuantity('-2.5', 'change_quantity')).toBe(-2.5);
    expect(parseSignedQuantity('10.375', 'change_quantity')).toBe(10.375);
  });

  test('rejects more than three decimal places', () => {
    expect(() =>
      parseSignedQuantity('1.2345', 'change_quantity'),
    ).toThrow(/3 decimal places/);
  });

  test('accepts zero for resolved location balances', () => {
    expect(parseNonNegativeQuantity('0', 'quantity')).toBe(0);
  });

  test('rejects negative resolved balances', () => {
    expect(() => parseNonNegativeQuantity('-1', 'quantity')).toThrow(
      /non-negative/,
    );
  });

  test('normalizes an optional unit of measure', () => {
    expect(normalizeUom('  lb  ')).toBe('lb');
    expect(normalizeUom('')).toBeNull();
  });
});
