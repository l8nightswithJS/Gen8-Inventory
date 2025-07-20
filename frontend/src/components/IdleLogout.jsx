// src/components/IdleLogout.jsx
import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export default function IdleLogout({ timeout = 15 * 60 * 1000 }) {
  const navigate = useNavigate()
  const timerId = useRef()

  // wrap in useCallback so it doesn't get a new identity each render
  const resetTimer = useCallback(() => {
    if (timerId.current) clearTimeout(timerId.current)
    timerId.current = setTimeout(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      navigate('/login', { replace: true })
    }, timeout)
  }, [navigate, timeout])

  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll'
    ]

    // start the idle timer
    resetTimer()

    // reset on any user interaction
    events.forEach(e => window.addEventListener(e, resetTimer))

    return () => {
      // clean up both the timer and listeners
      if (timerId.current) clearTimeout(timerId.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [resetTimer])   // now we properly declare the dependency

  return null
}
