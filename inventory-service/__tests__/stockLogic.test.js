const { computeLowState } = require('../controllers/_stockLogic');

describe('stock threshold logic', () => {
  test('returns low false when alerts are disabled', () => {
    const result = computeLowState(
      {
        low_stock_threshold: 10,
        alert_enabled: false,
      },
      5,
    );

    expect(result).toEqual({
      low: false,
      reason: null,
      threshold: null,
      qty: 5,
    });
  });

  test('returns low true below the low-stock threshold', () => {
    const result = computeLowState({ low_stock_threshold: 10 }, 5);

    expect(result.low).toBe(true);
    expect(result.reason).toBe('low_stock_threshold');
    expect(result.threshold).toBe(10);
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

  test('returns low false when no threshold is configured', () => {
    const result = computeLowState({}, 5);

    expect(result).toEqual({
      low: false,
      reason: null,
      threshold: null,
      qty: 5,
    });
  });
});
