const {
  normalizeExtractedData,
  numberOrNull,
} = require('../controllers/_receivingDocument');
const {
  normalizeContainers,
  normalizeQuality,
} = require('../controllers/smartReceivingController')._test;
const {
  parseQuantity,
} = require('../controllers/containerWorkflowController')._test;

describe('Smart Receiving normalization', () => {
  test('normalizes structured receiving extraction without inventing missing fields', () => {
    const normalized = normalizeExtractedData({
      document_type: 'Packing Slip',
      supplier_name: '  Supplier A  ',
      lines: [
        {
          part_number: ' RM005765 ',
          lot_number: 'LOT-1',
          quantity: '2,000',
          uom: 'EA',
          container_count: '20',
          quantity_per_container: '100',
          profile_hint: 'genmark_components',
        },
      ],
    });

    expect(normalized.document_type).toBe('packing_slip');
    expect(normalized.supplier_name).toBe('Supplier A');
    expect(normalized.lines[0]).toMatchObject({
      part_number: 'RM005765',
      lot_number: 'LOT-1',
      quantity: 2000,
      uom: 'EA',
      container_count: 20,
      quantity_per_container: 100,
      profile_hint: 'genmark_components',
    });
  });

  test('rejects ambiguous nonnumeric quantities instead of silently coercing them', () => {
    expect(numberOrNull('17,60')).toBeNull();
    expect(numberOrNull('1,760')).toBe(1760);
  });
});

describe('Receiving physical-container creation', () => {
  test('supports variable physical container quantities', () => {
    const containers = normalizeContainers(
      {
        containers: [
          { quantity: 55, package_type: 'Bin' },
          { quantity: 55, package_type: 'Bin' },
          { quantity: 42, package_type: 'Bin' },
        ],
      },
      152,
    );

    expect(containers).toHaveLength(3);
    expect(containers.map((container) => container.quantity)).toEqual([55, 55, 42]);
  });

  test('expands explicitly confirmed equal packaging', () => {
    const containers = normalizeContainers(
      {
        container_count: 20,
        quantity_per_container: 100,
        package_type: 'Box',
      },
      2000,
    );

    expect(containers).toHaveLength(20);
    expect(containers.every((container) => container.quantity === 100)).toBe(true);
  });

  test('blocks packaging totals that do not equal confirmed received quantity', () => {
    expect(() =>
      normalizeContainers(
        { container_count: 2, quantity_per_container: 55 },
        120,
      ),
    ).toThrow(/Packaging calculates to 110/);
  });

  test('defaults unknown quality values to pending inspection', () => {
    expect(normalizeQuality('released')).toBe('released');
    expect(normalizeQuality('something unexpected')).toBe('pending_inspection');
  });
});

describe('Split / repack quantity contract', () => {
  test('accepts positive quantities with up to three decimals', () => {
    expect(parseQuantity('55.125', 'quantity')).toBe(55.125);
    expect(parseQuantity('1,000', 'quantity')).toBe(1000);
  });

  test('rejects zero and excessive precision', () => {
    expect(() => parseQuantity('0', 'quantity')).toThrow(/greater than zero/);
    expect(() => parseQuantity('1.0001', 'quantity')).toThrow(/up to 3 decimals/);
  });
});
