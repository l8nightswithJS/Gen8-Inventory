import React, { useState } from 'react'
import { Link }            from 'react-router-dom'
import axios                from '../utils/axiosConfig'

const logoSrc = 'https://www.gener8.net/wp-content/uploads/2023/02/logo.svg'

export default function SplashPage() {
  const [showSignup, setShowSignup] = useState(false)
  const [form, setForm]             = useState({ username: '', password: '', role: 'staff' })
  const [msg, setMsg]               = useState('')

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const submit = async e => {
    e.preventDefault()
    setMsg('')
    try {
      const { data } = await axios.post('/api/auth/register', form)
      setMsg(data.message)
      setShowSignup(false)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Signup failed')
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex flex-col items-center justify-center
                      py-16 sm:py-20 lg:py-28
                      px-4">
        <img
          src={logoSrc}
          alt="Gener8"
          className="block h-20 sm:h-24 mb-4 animate-pulse"
        />

        <h1 className="font-extrabold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-center mb-2">
          Manage your inventory the Gener8 way
        </h1>

        <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
          Track parts, clients, and users seamlessly. Fast setup,
          rock-solid reliability, built-in security.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6 justify-center mb-8">
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-full shadow-sm
                       bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
          >
            Get Started
          </Link>

          <button
            onClick={() => { setShowSignup(s => !s); setMsg('') }}
            className="inline-block px-6 py-3 rounded-full shadow-sm
                       bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
          >
            Sign Up
          </button>
        </div>
      </div>

      
    </div>
  )
}