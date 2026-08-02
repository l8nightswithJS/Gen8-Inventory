const {
  ItemContractError,
  normalizeCreateItemPayload,
  normalizeUpdateItemPayload,
} = require('../controllers/_itemContract');

describe('item payload contract', () => {
  test('normalizes a canonical create payload', () => {
    const result = normalizeCreateItemPayload({
      client_id: '17',
      part_number: '  RM-100  ',
      lot_number: '  LOT-2  ',
      name: '  Sample Cap  ',
      description: '',
      barcode: '  ABC123  ',
      reorder_level: '25',
      low_stock_threshold: 10,
      alert_enabled: true,
      attributes: {
        color: 'clear',
        cavity: 4,
      },
    });

    expect(result).toEqual({
      clientId: 17,
      coreData: {
        part_number: 'RM-100',
        lot_number: 'LOT-2',
        name: 'Sample Cap',
        description: null,
        barcode: 'ABC123',
        reorder_level: 25,
        low_stock_threshold: 10,
        alert_enabled: true,
      },
      attributes: {
        color: 'clear',
        cavity: 4,
      },
    });
  });

  test('supports legacy flat custom fields without nesting attributes', () => {
    const result = normalizeCreateItemPayload({
      client_id: 3,
      part_number: 'P-1',
      attributes: { material: 'PC/ABS' },
      color: 'black',
      supplier_code: 'SUP-9',
    });

    expect(result.attributes).toEqual({
      material: 'PC/ABS',
      color: 'black',
      supplier_code: 'SUP-9',
    });
    expect(result.attributes).not.toHaveProperty('attributes');
  });

  test('ignores read-only and database fields submitted by old edit forms', () => {
    const result = normalizeUpdateItemPayload({
      id: 99,
      client_id: 7,
      part_number: 'P-2',
      created_at: '2026-08-02T00:00:00Z',
      updated_at: '2026-08-02T00:00:00Z',
      last_updated: '2026-08-02T00:00:00Z',
      total_quantity: 500,
      status: 'in_stock',
      alert_acknowledged_at: '2026-08-02T00:00:00Z',
      inventory_levels: [],
      attributes: { cavity: 8 },
    });

    expect(result.coreData).toEqual({ part_number: 'P-2' });
    expect(result.attributes).toEqual({ cavity: 8 });
  });

  test('allows an empty attributes object to replace existing custom values', () => {
    const result = normalizeUpdateItemPayload({ attributes: {} });

    expect(result.attributesProvided).toBe(true);
    expect(result.attributes).toEqual({});
  });

  test('does not replace attributes when they are omitted from a partial update', () => {
    const result = normalizeUpdateItemPayload({ name: 'Updated name' });

    expect(result.attributesProvided).toBe(false);
    expect(result.coreData).toEqual({ name: 'Updated name' });
  });

  test('converts blank optional values to null', () => {
    const result = normalizeUpdateItemPayload({
      lot_number: '',
      barcode: '   ',
      reorder_level: '',
      low_stock_threshold: null,
    });

    expect(result.coreData).toEqual({
      lot_number: null,
      barcode: null,
      reorder_level: null,
      low_stock_threshold: null,
    });
  });

  test.each([
    ['-1', 'reorder_level'],
    ['1.5', 'reorder_level'],
    ['abc', 'low_stock_threshold'],
  ])('rejects invalid non-negative integer value %s', (value, field) => {
    expect(() =>
      normalizeUpdateItemPayload({ [field]: value }),
    ).toThrow(ItemContractError);
  });

  test('requires a positive safe client ID', () => {
    expect(() =>
      normalizeCreateItemPayload({ client_id: 0, part_number: 'P-1' }),
    ).toThrow('client_id must be a positive integer.');
  });

  test('requires part_number when creating an item', () => {
    expect(() =>
      normalizeCreateItemPayload({ client_id: 1, name: 'Missing part' }),
    ).toThrow('part_number is required.');
  });

  test('rejects clearing part_number during an update', () => {
    expect(() => normalizeUpdateItemPayload({ part_number: '   ' })).toThrow(
      'part_number is required.',
    );
  });

  test('normalizes supported boolean representations', () => {
    expect(
      normalizeUpdateItemPayload({ alert_enabled: 'false' }).coreData,
    ).toEqual({ alert_enabled: false });
    expect(
      normalizeUpdateItemPayload({ alert_enabled: 'true' }).coreData,
    ).toEqual({ alert_enabled: true });
  });

  test('rejects arrays as attributes', () => {
    expect(() =>
      normalizeUpdateItemPayload({ attributes: ['invalid'] }),
    ).toThrow('attributes must be an object.');
  });
});
