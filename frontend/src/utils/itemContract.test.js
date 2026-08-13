import {
  buildItemPayload,
  createItemForm,
  getCustomAttributeKeys,
} from './itemContract';

describe('frontend item contract', () => {
  test('builds a canonical create payload', () => {
    const payload = buildItemPayload({
      clientId: '12',
      customKeys: ['color', 'total_quantity'],
      form: {
        part_number: '  RM-100  ',
        lot_number: '',
        name: ' Sample Cap ',
        description: ' Clear cap ',
        vendor_barcode: ' ABC123 ',
        uom: '',
        reorder_level: '25',
        low_stock_threshold: '10',
        alert_enabled: true,
        color: 'clear',
        total_quantity: 999,
      },
    });

    expect(payload).toEqual({
      client_id: 12,
      part_number: 'RM-100',
      lot_number: null,
      name: 'Sample Cap',
      description: 'Clear cap',
      vendor_barcode: 'ABC123',
      uom: null,
      reorder_level: 25,
      low_stock_threshold: 10,
      alert_enabled: true,
      attributes: {
        color: 'clear',
      },
    });
  });

  test('creates edit form state from core fields and attributes', () => {
    expect(
      createItemForm({
        part_number: 'P-1',
        lot_number: null,
        alert_enabled: false,
        attributes: {
          cavity: 4,
        },
      }),
    ).toMatchObject({
      part_number: 'P-1',
      lot_number: '',
      alert_enabled: false,
      cavity: 4,
    });
  });

  test(
    'combines schema and existing attributes while filtering reserved fields',
    () => {
      expect(
        getCustomAttributeKeys(
          ['color', 'barcode', 'total_quantity'],
          {
            attributes: {
              cavity: 8,
              color: 'black',
            },
          },
        ),
      ).toEqual(['color', 'cavity']);
    },
  );

  test('omits blank custom attribute values so edits can remove them', () => {
    const payload = buildItemPayload({
      customKeys: ['color', 'cavity'],
      form: {
        part_number: 'P-1',
        alert_enabled: true,
        color: '',
        cavity: 8,
      },
    });

    expect(payload.attributes).toEqual({
      cavity: 8,
    });
  });

  test('rejects missing part numbers and invalid decimal thresholds', () => {
    expect(() =>
      buildItemPayload({
        form: {
          part_number: '   ',
        },
      }),
    ).toThrow('Part Number is required.');

    expect(() =>
      buildItemPayload({
        form: {
          part_number: 'P-1',
          reorder_level: '1.2345',
        },
      }),
    ).toThrow(
      'Reorder Level must be a non-negative number with no more than 3 decimal places.',
    );
  });

  test('accepts fractional thresholds up to three decimal places', () => {
    const payload = buildItemPayload({
      form: {
        part_number: 'P-1',
        reorder_level: '1.5',
        low_stock_threshold: '0.125',
      },
    });

    expect(payload.reorder_level).toBe(1.5);
    expect(payload.low_stock_threshold).toBe(0.125);
  });
});