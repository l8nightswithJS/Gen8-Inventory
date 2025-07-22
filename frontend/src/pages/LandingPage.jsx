// src/pages/LandingPage.jsx
import React, { useState } from 'react'
import { Link }            from 'react-router-dom'
import SignupModal         from '../components/SignupModal'
import illustration        from '../assets/landing.png'
import logoImg             from '../assets/logo.svg'

export default function LandingPage() {
  const [showSignup, setShowSignup] = useState(false)

  return (
    <div className="bg-white flex flex-col">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        {/* Inline logo + text */}
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold">
          <img src={logoImg} alt="Gener8" className="h-8 sm:h-10" />
          <span className="text-green-500">Inventory</span>
        </h1>

        <Link to="/login" className="text-base font-medium text-gray-800 hover:underline">
          Login
        </Link>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12 sm:py-16 lg:py-20">
          
          {/* Left Column */}
          <div className="space-y-4 max-w-2xl mx-auto lg:mx-0 text-left">
            {/* Overline with inline logo */}
            <h3 className="flex items-center gap-2 text-indigo-600 uppercase tracking-wide font-semibold text-sm sm:text-base">
              The
              <img src={logoImg} alt="Gener8" className="h-5 sm:h-6 inline-block"/>
              Approach
            </h3>

            {/* Main headline */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
              Manage your inventory with confidence
            </h2>

            {/* Sub‑text */}
            <p className="text-base sm:text-lg text-gray-600">
              Streamline tracking of parts, clients, and users under one unified dashboard.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700
                           text-white font-medium rounded-lg text-center"
              >
                Get Started
              </Link>
              <button
                onClick={() => setShowSignup(true)}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700
                           text-white font-medium rounded-lg text-center"
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex justify-center lg:justify-end">
            <img
              src={illustration}
              alt="Product inventory workflow"
              className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto"
            />
          </div>
        </div>
      </div>

      {/* Signup Modal */}
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </div>
  )
}
