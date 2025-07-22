// src/components/Footer.jsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import logog8 from '../assets/logog8.png'

export default function Footer() {
  const { pathname } = useLocation()
  return (
    <section className="bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={logog8}
            alt="Gener8 blocks"
            className="w-12 h-12 flex-shrink-0"
          />
          <blockquote className="italic text-gray-700 text-sm">
            “Inventory accuracy is the hallmark of operational excellence.”
            <cite className="block mt-1 not-italic text-xs font-semibold text-gray-800">
              — Gener8 Team
            </cite>
          </blockquote>
        </div>

        <a
          href="mailto:feedback@gener8.net"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white
                     px-4 py-2 rounded-md text-sm shadow-sm"
        >
          Send Feedback
        </a>
      </div>

      <footer className="bg-gray-100 text-center text-xs text-gray-500 py-3 mt-4">
        © {new Date().getFullYear()} Gener8 Inventory. All rights reserved.
      </footer>
    </section>
)}
