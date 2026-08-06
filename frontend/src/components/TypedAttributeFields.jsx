const INPUT_STYLES =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

function FieldLabel({ definition }) {
  return (
    <label
      htmlFor={`attribute-${definition.key}`}
      className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
    >
      {definition.label}
      {definition.required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

export default function TypedAttributeFields({
  definitions = [],
  form,
  onChange,
}) {
  if (!definitions.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {definitions.map((definition) => {
        const value = form[definition.key];
        const id = `attribute-${definition.key}`;

        if (definition.type === 'boolean') {
          return (
            <div key={definition.key} className="flex items-center gap-2 pt-6">
              <input
                id={id}
                name={definition.key}
                type="checkbox"
                checked={value === true}
                onChange={onChange}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={id} className="text-sm text-slate-700 dark:text-slate-300">
                {definition.label}
              </label>
            </div>
          );
        }

        if (definition.type === 'long_text') {
          return (
            <div key={definition.key} className="sm:col-span-2">
              <FieldLabel definition={definition} />
              <textarea
                id={id}
                name={definition.key}
                required={definition.required}
                value={value ?? ''}
                onChange={onChange}
                rows="3"
                className={INPUT_STYLES}
              />
            </div>
          );
        }

        if (definition.type === 'select') {
          return (
            <div key={definition.key}>
              <FieldLabel definition={definition} />
              <select
                id={id}
                name={definition.key}
                required={definition.required}
                value={value ?? ''}
                onChange={onChange}
                className={INPUT_STYLES}
              >
                <option value="">Select…</option>
                {(definition.options || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        const type =
          definition.type === 'date'
            ? 'date'
            : definition.type === 'decimal' || definition.type === 'number'
              ? 'number'
              : 'text';

        return (
          <div key={definition.key}>
            <FieldLabel definition={definition} />
            <input
              id={id}
              name={definition.key}
              type={type}
              required={definition.required}
              step={definition.type === 'decimal' ? 'any' : undefined}
              value={value ?? ''}
              onChange={onChange}
              className={INPUT_STYLES}
            />
          </div>
        );
      })}
    </div>
  );
}
