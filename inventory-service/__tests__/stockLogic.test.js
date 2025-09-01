// inventory-service/__tests__/stockLogic.test.js
// We are destructuring the imported object to get the specific functions we need.
const { computeLowState } = require('../controllers/_stockLogic');

describe('Stock Logic', () => {
  describe('computeLowState', () => {
    it('should return "low: false" when alerts are disabled', () => {
      const item = {
        quantity: 5,
        low_stock_threshold: 10,
        alert_enabled: false,
      };
      const result = computeLowState(item);
      expect(result.low).toBe(false);
    });

    it('should return "low: true" when quantity is below the low_stock_threshold', () => {
      const item = { quantity: 5, low_stock_threshold: 10 };
      const result = computeLowState(item);
      expect(result.low).toBe(true);
      expect(result.reason).toBe('low_stock_threshold');
    });

    it('should return "low: true" when quantity is equal to the low_stock_threshold', () => {
      const item = { quantity: 10, low_stock_threshold: 10 };
      const result = computeLowState(item);
      expect(result.low).toBe(true);
    });

    it('should return "low: false" when quantity is above all thresholds', () => {
      const item = { quantity: 100, low_stock_threshold: 10, reorder_level: 5 };
      const result = computeLowState(item);
      expect(result.low).toBe(false);
    });

    it('should use the reorder_level if it is lower than the low_stock_threshold', () => {
      const item = { quantity: 3, low_stock_threshold: 10, reorder_level: 5 };
      const result = computeLowState(item);
      expect(result.low).toBe(true);
      expect(result.reason).toBe('reorder_level'); // Because reorder_level is the lower (minimum) threshold
      expect(result.threshold).toBe(5);
    });

    it('should handle items with no quantity information gracefully', () => {
      const item = { low_stock_threshold: 10 };
      const result = computeLowState(item);
      expect(result.low).toBe(false);
      expect(result.qty).toBe(null);
    });
  });
});
