import { Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { restoreSession, getAccessToken } from '../services/auth'

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    async function checkSession() {
      // Si ya hay un access token (en memoria o sessionStorage), se considera autenticado.
      if (getAccessToken()) {
        setAuthenticated(true)
        setLoading(false)
        return
      }

      try {
        const restored = await restoreSession()
        setAuthenticated(restored)
      } catch {
        setAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Verificando sesión...</span>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
