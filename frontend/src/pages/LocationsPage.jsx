// In frontend/src/pages/LocationsPage.jsx (new file)

export default function LocationsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Manage Locations
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Add, edit, or remove warehouse locations.
          </p>
        </div>
        {/* We will add a button here later */}
      </div>

      {/* We will add the data fetching and display logic here in the next step. */}
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <p className="text-slate-500">Loading locations data...</p>
      </div>
    </div>
  );
}
