// inventory-service/__tests__/stockLogic.test.js
const {
  computeLowState,
  calculateStockLevels,
} = require('../controllers/_stockLogic');

describe('Stock Logic', () => {
  describe('computeLowState(item, total_quantity)', () => {
    it('does not trigger an alert when disabled', () => {
      const result = computeLowState(
        { low_stock_threshold: 10, alert_enabled: false },
        5,
      );
      expect(result.low).toBe(false);
      expect(result.qty).toBe(5);
    });

    it('triggers below the low-stock threshold', () => {
      const result = computeLowState({ low_stock_threshold: 10 }, 5);
      expect(result).toMatchObject({
        low: true,
        reason: 'low_stock_threshold',
        threshold: 10,
        qty: 5,
      });
    });

    it('triggers at the low-stock threshold', () => {
      expect(computeLowState({ low_stock_threshold: 10 }, 10).low).toBe(true);
    });

    it('does not trigger above all thresholds', () => {
      const item = { low_stock_threshold: 10, reorder_level: 5 };
      expect(computeLowState(item, 100).low).toBe(false);
    });

    it('preserves the existing rule that the lower of two thresholds wins', () => {
      const result = computeLowState(
        { low_stock_threshold: 10, reorder_level: 5 },
        3,
      );
      expect(result).toMatchObject({
        low: true,
        reason: 'reorder_level',
        threshold: 5,
        qty: 3,
      });
    });

    it('returns a non-alert state for missing quantity data', () => {
      const result = computeLowState({ low_stock_threshold: 10 });
      expect(result.low).toBe(false);
      expect(result.qty).toBeNull();
    });

    it('handles a numeric string quantity returned by a database', () => {
      const result = computeLowState({ low_stock_threshold: 10 }, '7');
      expect(result).toMatchObject({ low: true, qty: 7 });
    });

    it('does not falsely trigger for an invalid quantity', () => {
      const result = computeLowState({ low_stock_threshold: 10 }, 'invalid');
      expect(result).toMatchObject({ low: false, qty: null });
    });
  });

  describe('calculateStockLevels', () => {
    it('reads aggregated total_quantity from the inventory query', () => {
      const [item] = calculateStockLevels([
        {
          id: 1,
          part_number: 'RESIN-1',
          total_quantity: 7,
          quantity: 100,
          low_stock_threshold: 10,
        },
      ]);
      expect(item.status).toBe('low_stock');
    });

    it('aggregates quantities across lots with the same part number', () => {
      const result = calculateStockLevels([
        { id: 1, part_number: 'RESIN-1', total_quantity: 3, low_stock_threshold: 10 },
        { id: 2, part_number: 'RESIN-1', total_quantity: 4, low_stock_threshold: 10 },
      ]);
      expect(result.map((item) => item.status)).toEqual([
        'low_stock',
        'low_stock',
      ]);
    });

    it('keeps positive stock above its threshold in stock', () => {
      const [item] = calculateStockLevels([
        { id: 1, part_number: 'RESIN-1', total_quantity: 20, low_stock_threshold: 10 },
      ]);
      expect(item.status).toBe('in_stock');
    });

    it('marks zero aggregate stock out of stock', () => {
      const [item] = calculateStockLevels([
        { id: 1, part_number: 'RESIN-1', total_quantity: 0 },
      ]);
      expect(item.status).toBe('out_of_stock');
    });

    it('evaluates R&D materials with no assigned part number independently', () => {
      const result = calculateStockLevels([
        { id: 1, part_number: null, total_quantity: 3, low_stock_threshold: 5 },
        { id: 2, part_number: null, total_quantity: 0, low_stock_threshold: 5 },
      ]);
      expect(result.map((item) => item.status)).toEqual([
        'low_stock',
        'out_of_stock',
      ]);
    });
  });
});
