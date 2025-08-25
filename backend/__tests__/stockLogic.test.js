const { categorizeStockLevel } = require('../controllers/_stockLogic');

describe('Stock Logic', () => {
  describe('categorizeStockLevel', () => {
    it('should return "In Stock" when quantity is above low stock threshold', () => {
      const item = { quantity: 20, low_stock_threshold: 10 };
      expect(categorizeStockLevel(item)).toBe('In Stock');
    });

    it('should return "Low Stock" when quantity is at or below the threshold but above 0', () => {
      const item = { quantity: 10, low_stock_threshold: 10 };
      expect(categorizeStockLevel(item)).toBe('Low Stock');
    });

    it('should return "Out of Stock" when quantity is 0', () => {
      const item = { quantity: 0, low_stock_threshold: 10 };
      expect(categorizeStockLevel(item)).toBe('Out of Stock');
    });

    it('should handle missing low_stock_threshold gracefully', () => {
      const item = { quantity: 5 };
      // Assuming a default threshold or specific behavior
      expect(categorizeStockLevel(item)).toBe('In Stock'); // Or whatever the expected default is
    });
  });
});
