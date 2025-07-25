// src/components/Footer.jsx
import React from 'react'
import logog8 from '../assets/logog8.png'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="sticky bottom-0 bg-white border-t px-4 py-2 sm:py-4 lg:py-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center 
                      justify-between gap-3">
        {/* Quote */}
        <div className="flex items-center gap-2">
          <img src={logog8} alt="Gener8 blocks" className="w-6 h-6 sm:w-8 sm:h-8" />
          <blockquote className="italic text-gray-700 text-[11px] sm:text-sm">
            “Inventory accuracy is the hallmark of operational excellence.”
            <cite className="block not-italic font-semibold text-gray-900 mt-0.5 text-[10px] sm:text-xs">
              — Gener8 Team
            </cite>
          </blockquote>
        </div>
        {/* Feedback */}
        <a
          href="mailto:feedback@gener8.net"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white 
                     px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-sm 
                     shadow-sm transition"
        >
          Send Feedback
        </a>
      </div>
      <div className="text-center text-gray-500 text-[10px] sm:text-xs mt-2">
        © {year} Gener8 Inventory. All rights reserved.
      </div>
    </footer>
  )
}
