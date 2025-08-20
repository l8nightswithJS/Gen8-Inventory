export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="sticky bottom-0 z-20 bg-white/95 border-t backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-auto md:h-12 py-2 flex flex-col md:flex-row items-center justify-between text-center md:text-left">
        <div className="flex items-center gap-3 min-w-0 mb-2 md:mb-0">
          <span className="inline-flex items-center justify-center rounded-md bg-white ring-1 ring-gray-300 p-[2px]">
            <img
              src="/logo192.png"
              alt="Gener8"
              className="h-6 w-6 md:h-7 md:w-7 object-contain"
              style={{
                filter:
                  'drop-shadow(0 0 1px rgba(0,0,0,.45)) contrast(1.18) saturate(1.05)',
              }}
              loading="lazy"
            />
          </span>

          <p className="text-xs sm:text-sm text-gray-600 truncate">
            “Inventory accuracy is the hallmark of operational excellence.”
            <span className="hidden sm:inline ml-2 text-gray-500">
              — Gener8 Team
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/feedback"
            className="text-xs sm:text-sm px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            Feedback
          </a>
          <span className="text-xs sm:text-sm text-gray-500">
            © {year} Gener8 Inventory
          </span>
        </div>
      </div>
    </footer>
  );
}
