import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="sticky bottom-0 z-20 bg-gradient-to-t from-white to-slate-50 border-t backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        {/* Left: logo + quote */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo192.png"
            alt="Gener8"
            className="h-6 w-6 rounded-[6px] ring-1 ring-gray-200"
            loading="lazy"
          />
          <p className="text-[12px] text-gray-600 truncate">
            “Inventory accuracy is the hallmark of operational excellence.”
            <span className="ml-2 text-gray-500">— Gener8 Team</span>
          </p>
        </div>

        {/* Right: compact feedback + copyright */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/feedback"
            className="text-[12px] px-2 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Feedback
          </a>
          <span className="text-[12px] text-gray-500">
            © {year} Gener8 Inventory
          </span>
        </div>
      </div>
    </footer>
  );
}
