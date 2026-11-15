import { useState } from 'react'
import { apiRequest } from '../services/api'
import { logout } from '../services/auth'
import { useNavigate } from 'react-router-dom'

export default function CambiarPassword() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [formulario, setFormulario] = useState({
    contraseña_actual: '',
    contraseña_nueva: '',
    confirmar_contraseña: '',
  })

  async function manejarCambio(evento) {
    const { name, value } = evento.target
    formulario[name] = value
    setFormulario({ ...formulario })
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    setError('')
    setMensajeExito('')
    setCargando(true)

    try {
      await apiRequest('/api/usuarios/cambiar-password/', {
        method: 'POST',
        body: JSON.stringify(formulario),
      })

      setMensajeExito(
        'Contraseña cambiada correctamente. Inicia sesión nuevamente.'
      )

      // Cerrar sesión y redirigir al login.
      setTimeout(() => {
        logout()
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err) {
      // Mostrar el error específico del servidor si está disponible
      const errorMessage = err.data?.detail || err.data?.contraseña_actual || err.data?.contraseña_nueva || err.data?.confirmar_contraseña || err.message || 'No se pudo cambiar la contraseña.'
      setError(errorMessage)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="page-heading cambiar-password-page">
      <div className="cambiar-password-header">
        <div>
          <h1>Cambiar contraseña</h1>
          <p>Actualiza la contraseña de tu cuenta.</p>
        </div>
      </div>
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}
      {mensajeExito && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="bi bi-check-circle me-2"></i>
          {mensajeExito}
        </div>
      )}
      <div className="cambiar-password-card">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Contraseña actual</label>
              <input
                type="password"
                name="contraseña_actual"
                className="form-control"
                value={formulario.contraseña_actual}
                onChange={manejarCambio}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Nueva contraseña</label>
              <input
                type="password"
                name="contraseña_nueva"
                className="form-control"
                value={formulario.contraseña_nueva}
                onChange={manejarCambio}
                minLength="8"
                required
                placeholder="••••••••"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Confirmar nueva contraseña</label>
              <input
                type="password"
                name="confirmar_contraseña"
                className="form-control"
                value={formulario.confirmar_contraseña}
                onChange={manejarCambio}
                minLength="8"
                required
                placeholder="••••••••"
              />
            </div>
          </div>
          <hr className="my-4" />
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate('/')}
              disabled={cargando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-2"></i>
                  Guardar nueva contraseña
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
