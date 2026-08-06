const {
  applyProfileToItem,
  deriveProfileMetrics,
  validateProfileAttributes,
} = require('../controllers/_profileSettings');
const {
  getProfilePreset,
  normalizeSettings,
} = require('../../packages/inventory-profiles');

describe('phase 2 profile metrics', () => {
  const settings = normalizeSettings({
    profile_key: 'genmark_components',
    ...getProfilePreset('genmark_components'),
  });

  test('marks stock at or below minimum quantity as critical', () => {
    const metrics = deriveProfileMetrics(
      {
        attributes: {
          minimum_quantity: 2000,
          weekly_demand: 1000,
          reorder_quantity: 6000,
          target_quantity: 8000,
        },
      },
      1500,
    );

    expect(metrics.status).toBe('critical');
    expect(metrics.priority).toBe('High');
    expect(metrics.weeks_on_hand).toBe(1.5);
    expect(metrics.suggested_reorder).toBe(6500);
  });

  test('uses fixed reorder quantity when it is larger than the target gap', () => {
    const metrics = deriveProfileMetrics(
      {
        reorder_level: 4000,
        attributes: {
          minimum_quantity: 1000,
          weekly_demand: 1000,
          reorder_quantity: 6000,
          target_quantity: 8000,
        },
      },
      3500,
    );

    expect(metrics.status).toBe('low_stock');
    expect(metrics.priority).toBe('Medium');
    expect(metrics.weeks_on_hand).toBe(3.5);
    expect(metrics.suggested_reorder).toBe(6000);
  });

  test('does not calculate weeks on hand without positive demand', () => {
    const metrics = deriveProfileMetrics(
      { attributes: { weekly_demand: 0 } },
      500,
    );

    expect(metrics.weeks_on_hand).toBeNull();
    expect(metrics.status).toBe('in_stock');
    expect(metrics.priority).toBe('Normal');
  });

  test('review state takes priority over planning status', () => {
    const metrics = deriveProfileMetrics(
      {
        review_status: 'needs_review',
        attributes: { minimum_quantity: 1000 },
      },
      0,
    );

    expect(metrics.status).toBe('needs_review');
    expect(metrics.priority).toBe('Review');
  });

  test('applies the profile default UOM without overwriting item UOM', () => {
    expect(
      applyProfileToItem({ attributes: {} }, 5, settings).uom,
    ).toBe('ea');
    expect(
      applyProfileToItem({ uom: 'box', attributes: {} }, 5, settings).uom,
    ).toBe('box');
  });
});

describe('phase 2 typed profile attributes', () => {
  const settings = normalizeSettings({
    profile_key: 'general',
    field_definitions: [
      { key: 'demand', label: 'Demand', type: 'decimal', required: true },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        options: ['Accepted', 'Hold'],
      },
      { key: 'approved', label: 'Approved', type: 'boolean' },
    ],
  });

  test('coerces numeric and boolean values', () => {
    expect(
      validateProfileAttributes(
        { demand: '2,500.5', condition: 'Accepted', approved: 'yes' },
        settings,
      ),
    ).toEqual({
      demand: 2500.5,
      condition: 'Accepted',
      approved: true,
    });
  });

  test('rejects invalid select values', () => {
    expect(() =>
      validateProfileAttributes(
        { demand: 1, condition: 'Rejected' },
        settings,
      ),
    ).toThrow(/Condition must be one of/);
  });

  test('enforces required typed fields', () => {
    expect(() =>
      validateProfileAttributes({ condition: 'Accepted' }, settings),
    ).toThrow(/Demand is required/);
  });

  test('rejects custom fields that shadow protected inventory data', () => {
    expect(() =>
      normalizeSettings({
        profile_key: 'general',
        field_definitions: [
          { key: 'part_number', label: 'Duplicate Part Number', type: 'text' },
        ],
      }),
    ).toThrow(/part_number.*reserved/i);

    expect(() =>
      normalizeSettings({
        profile_key: 'general',
        field_definitions: [
          { key: 'status', label: 'Manual Status', type: 'text' },
        ],
      }),
    ).toThrow(/status.*reserved/i);
  });
});
