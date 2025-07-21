// src/components/PrivateRoute.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'

/** Returns true if JWT exists and its `exp` claim is still in the future */
function isTokenValid(token) {
  if (!token) return false
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]))
    return typeof exp === 'number' && Date.now() < exp * 1000
  } catch {
    return false
  }
}

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')

  if (!isTokenValid(token)) {
    // clear any stale auth
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    return <Navigate to="/" replace />
  }

  return children
}
