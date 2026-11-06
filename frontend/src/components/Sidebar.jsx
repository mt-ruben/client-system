
import { NavLink } from 'react-router-dom'

const enlaces = [
  { to: '/', label: 'Dashboard', icon: 'bi-grid-1x2-fill', end: true },
  { to: '/clientes', label: 'Clientes', icon: 'bi-people-fill' },
  { to: '/productos', label: 'Productos', icon: 'bi-box-seam-fill' },
  { to: '/pedidos', label: 'Pedidos', icon: 'bi-cart-fill' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <i className="bi bi-layers-fill"></i>
        <span>Sistema Clientes</span>
      </div>

      <div className="sidebar-section-title">MENÚ PRINCIPAL</div>

      <nav className="sidebar-nav">
        {enlaces.map((enlace) => (
          <NavLink
            key={enlace.to}
            to={enlace.to}
            end={enlace.end}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <i className={`bi ${enlace.icon}`}></i>
            <span>{enlace.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
