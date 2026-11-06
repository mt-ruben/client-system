
import { useNavigate } from 'react-router-dom'
import { logout } from '../services/auth'
import { logoutRequest } from '../services/api'

export default function Navbar() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logoutRequest()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="topbar">
      <div>
        <span className="topbar-label">SISTEMA DE GESTIÓN</span>
        <h6 className="topbar-title">Panel administrativo</h6>
      </div>

      <div className="topbar-user">
        <div className="user-avatar">A</div>

        <div className="user-info">
          <span className="user-name">Administrador</span>
          <span className="user-role">Gestión del sistema</span>
        </div>

        <button
          type="button"
          className="btn btn-outline-danger btn-sm ms-3"
          onClick={handleLogout}
          title="Cerrar sesión"
        >
          <i className="bi bi-box-arrow-right me-1"></i>
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
