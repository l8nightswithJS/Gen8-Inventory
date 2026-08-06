import { useEffect, useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const TYPE_OPTIONS = [
  ['text', 'Text'],
  ['long_text', 'Long Text'],
  ['decimal', 'Decimal'],
  ['number', 'Whole Number'],
  ['date', 'Date'],
  ['boolean', 'Yes / No'],
  ['select', 'Select List'],
];

const COLUMN_LABELS = {
  part_number: 'Part Number',
  name: 'Name',
  description: 'Description',
  lot_number: 'Lot Number',
  inventory_location: 'Location',
  total_quantity: 'On Hand',
  uom: 'Unit of Measure',
  status: 'Status',
  reorder_level: 'Reorder Level',
  low_stock_threshold: 'Low-Stock Threshold',
  vendor_barcode: 'Vendor Barcode',
  barcode: 'Internal Barcode',
  weeks_on_hand: 'Weeks on Hand',
  suggested_reorder: 'Suggested Reorder',
  priority: 'Priority',
};

function displayColumn(key, definitions) {
  const definition = definitions.find((entry) => entry.key === key);
  return definition?.label || COLUMN_LABELS[key] || key.replace(/_/g, ' ');
}

function normalizeDefinition(definition) {
  return {
    key: definition.key || '',
    label: definition.label || '',
    type: definition.type || 'text',
    required: definition.required === true,
    options: Array.isArray(definition.options) ? definition.options : [],
  };
}

export default function InventoryProfileModal({
  clientId,
  settings,
  onClose,
  onSaved,
}) {
  const [profiles, setProfiles] = useState([]);
  const [coreFields, setCoreFields] = useState([]);
  const [derivedFields, setDerivedFields] = useState([]);
  const [locations, setLocations] = useState([]);
  const [profileKey, setProfileKey] = useState(settings.profile_key || 'general');
  const [initialProfileKey] = useState(settings.profile_key || 'general');
  const [defaultUom, setDefaultUom] = useState(settings.default_uom || '');
  const [defaultLocationId, setDefaultLocationId] = useState(
    settings.default_location_id ? String(settings.default_location_id) : '',
  );
  const [displayColumns, setDisplayColumns] = useState(
    settings.display_columns || [],
  );
  const [fieldDefinitions, setFieldDefinitions] = useState(
    (settings.field_definitions || []).map(normalizeDefinition),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [profileResponse, locationResponse] = await Promise.all([
          api.get('/api/clients/inventory-profiles'),
          api.get('/api/locations'),
        ]);
        setProfiles(profileResponse.data?.profiles || []);
        setCoreFields(profileResponse.data?.core_fields || []);
        setDerivedFields(profileResponse.data?.derived_fields || []);
        setLocations(Array.isArray(locationResponse.data) ? locationResponse.data : []);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            'Failed to load inventory profile options.',
        );
      }
    };
    loadOptions();
  }, []);

  const selectableColumns = useMemo(() => {
    const values = [
      ...coreFields,
      ...derivedFields,
      ...fieldDefinitions.map((definition) => definition.key),
    ].filter(Boolean);
    return Array.from(new Set(values));
  }, [coreFields, derivedFields, fieldDefinitions]);

  const applyProfile = (key) => {
    const profile = profiles.find((entry) => entry.key === key);
    setProfileKey(key);
    if (!profile) return;
    setDefaultUom(profile.default_uom || '');
    setDisplayColumns(profile.display_columns || []);
    setFieldDefinitions(
      (profile.field_definitions || []).map(normalizeDefinition),
    );
  };

  const updateDefinition = (index, field, value) => {
    setFieldDefinitions((previous) =>
      previous.map((definition, definitionIndex) =>
        definitionIndex === index
          ? {
              ...definition,
              [field]:
                field === 'required'
                  ? value
                  : field === 'options'
                    ? value.split(',').map((option) => option.trim()).filter(Boolean)
                    : value,
            }
          : definition,
      ),
    );
  };

  const addDefinition = () => {
    setFieldDefinitions((previous) => [
      ...previous,
      { key: '', label: '', type: 'text', required: false, options: [] },
    ]);
  };

  const removeDefinition = (index) => {
    setFieldDefinitions((previous) =>
      previous.filter((_, definitionIndex) => definitionIndex !== index),
    );
  };

  const toggleColumn = (key) => {
    setDisplayColumns((previous) =>
      previous.includes(key)
        ? previous.filter((column) => column !== key)
        : [...previous, key],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const cleanedDefinitions = fieldDefinitions
        .map((definition) => ({
          ...definition,
          key: definition.key.trim().toLowerCase().replace(/\s+/g, '_'),
          label: definition.label.trim(),
        }))
        .filter((definition) => definition.key && definition.label);
      const profileChanged = profileKey !== initialProfileKey;

      const { data } = await api.put(
        `/api/clients/${clientId}/inventory-settings`,
        {
          profile_key: profileKey,
          default_uom: defaultUom.trim() || null,
          default_location_id: defaultLocationId
            ? Number(defaultLocationId)
            : null,
          display_columns: displayColumns,
          field_definitions: cleanedDefinitions,
          apply_preset: profileChanged,
        },
      );
      await onSaved?.(data);
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Failed to save inventory profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Inventory Profile"
      size="max-w-4xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Inventory Profile
            <select
              value={profileKey}
              onChange={(event) => applyProfile(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            >
              {profiles.map((profile) => (
                <option key={profile.key} value={profile.key}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Default Unit of Measure
            <input
              value={defaultUom}
              onChange={(event) => setDefaultUom(event.target.value)}
              placeholder="ea, lb, pieces"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Default Import Location
            <select
              value={defaultLocationId}
              onChange={(event) => setDefaultLocationId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">No default location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code}
                  {location.description ? ` — ${location.description}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">
                Typed Profile Fields
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These fields are shared across users and validated during edits and imports.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={addDefinition}>
              Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {fieldDefinitions.map((definition, index) => (
              <div
                key={`${definition.key}-${index}`}
                className="grid gap-2 rounded border border-slate-200 p-3 md:grid-cols-[1fr_1.2fr_0.8fr_1.4fr_auto_auto] dark:border-slate-700"
              >
                <input
                  value={definition.key}
                  onChange={(event) => updateDefinition(index, 'key', event.target.value)}
                  placeholder="field_key"
                  className="rounded border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  value={definition.label}
                  onChange={(event) => updateDefinition(index, 'label', event.target.value)}
                  placeholder="Display label"
                  className="rounded border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
                <select
                  value={definition.type}
                  onChange={(event) => updateDefinition(index, 'type', event.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                >
                  {TYPE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  value={(definition.options || []).join(', ')}
                  onChange={(event) => updateDefinition(index, 'options', event.target.value)}
                  placeholder="Select options, comma separated"
                  disabled={definition.type !== 'select'}
                  className="rounded border border-slate-300 px-2 py-1.5 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={definition.required}
                    onChange={(event) =>
                      updateDefinition(index, 'required', event.target.checked)
                    }
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => removeDefinition(index)}
                  className="text-sm font-medium text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">
            Shared Inventory Columns
          </h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            These replace the old browser-only column settings.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {selectableColumns.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={displayColumns.includes(key)}
                  onChange={() => toggleColumn(key)}
                />
                {displayColumn(key, fieldDefinitions)}
              </label>
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
