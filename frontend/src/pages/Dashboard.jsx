
const tarjetas = [
  {
    titulo: 'Clientes',
    descripcion: 'Clientes registrados',
    icono: 'bi-people-fill',
    color: 'blue',
  },
  {
    titulo: 'Productos',
    descripcion: 'Productos del catálogo',
    icono: 'bi-box-seam-fill',
    color: 'teal',
  },
  {
    titulo: 'Pedidos',
    descripcion: 'Pedidos registrados',
    icono: 'bi-cart-check-fill',
    color: 'orange',
  },
  {
    titulo: 'Ventas',
    descripcion: 'Resumen de ventas',
    icono: 'bi-currency-dollar',
    color: 'purple',
  },
]

export default function Dashboard() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen general del sistema de clientes.</p>
        </div>
        <span className="status-badge">
          <span className="status-dot"></span>
          Panel de administración
        </span>
      </div>

      <div className="row g-3">
        {tarjetas.map((tarjeta) => (
          <div className="col-12 col-sm-6 col-xl-3" key={tarjeta.titulo}>
            <article className="stat-card">
              <div className={`stat-icon ${tarjeta.color}`}>
                <i className={`bi ${tarjeta.icono}`}></i>
              </div>

              <div className="stat-title">{tarjeta.titulo}</div>
              <div className="stat-value">—</div>
              <div className="stat-description">
                {tarjeta.descripcion}
              </div>
            </article>
          </div>
        ))}
      </div>

      <section className="welcome-card">
        <div className="welcome-icon">
          <i className="bi bi-bar-chart-line-fill"></i>
        </div>
        <div>
          <h2>Bienvenido al sistema</h2>
          <p>
            Desde aquí podrás administrar clientes, productos y pedidos
            en un solo lugar.
          </p>
        </div>
      </section>
    </>
  )
}
