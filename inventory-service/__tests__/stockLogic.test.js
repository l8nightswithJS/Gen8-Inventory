const {
  computeLowState,
  deriveStockStatus,
} = require('../controllers/_stockLogic');

describe('stock threshold logic', () => {
  test('returns low false when alerts are disabled but preserves threshold metadata', () => {
    const result = computeLowState(
      {
        low_stock_threshold: 10,
        alert_enabled: false,
      },
      5,
    );

    expect(result).toEqual({
      low: false,
      reason: 'low_stock_threshold',
      threshold: 10,
      thresholdConfigured: true,
      qty: 5,
    });
  });

  test('returns low true below the low-stock threshold', () => {
    const result = computeLowState({ low_stock_threshold: 10 }, 5);

    expect(result.low).toBe(true);
    expect(result.reason).toBe('low_stock_threshold');
    expect(result.threshold).toBe(10);
    expect(result.thresholdConfigured).toBe(true);
    expect(result.qty).toBe(5);
  });

  test('returns low true when quantity equals the threshold', () => {
    const result = computeLowState({ low_stock_threshold: 10 }, 10);
    expect(result.low).toBe(true);
  });

  test('returns low false above all configured thresholds', () => {
    const result = computeLowState(
      {
        low_stock_threshold: 10,
        reorder_level: 5,
      },
      100,
    );

    expect(result.low).toBe(false);
    expect(result.threshold).toBe(5);
  });

  test('uses the lower configured threshold', () => {
    const result = computeLowState(
      {
        low_stock_threshold: 10,
        reorder_level: 5,
      },
      3,
    );

    expect(result.low).toBe(true);
    expect(result.reason).toBe('reorder_level');
    expect(result.threshold).toBe(5);
  });

  test('does not coerce a missing threshold to zero', () => {
    const result = computeLowState({}, 0);

    expect(result).toEqual({
      low: false,
      reason: null,
      threshold: null,
      thresholdConfigured: false,
      qty: 0,
    });
  });
});

describe('stock status', () => {
  test('review state takes priority over quantity state', () => {
    expect(
      deriveStockStatus({ review_status: 'needs_review' }, 0),
    ).toBe('needs_review');
  });

  test('zero quantity is out of stock rather than low stock', () => {
    expect(deriveStockStatus({ reorder_level: 10 }, 0)).toBe('out_of_stock');
  });

  test('positive quantity without a threshold is in stock', () => {
    expect(deriveStockStatus({}, 5)).toBe('in_stock');
  });

  test('decimal quantity is evaluated without truncation', () => {
    expect(deriveStockStatus({ low_stock_threshold: 2.5 }, 2.4)).toBe(
      'low_stock',
    );
    expect(deriveStockStatus({ low_stock_threshold: 2.5 }, 2.6)).toBe(
      'in_stock',
    );
  });
});
