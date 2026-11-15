import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../services/api'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const temporizadorBusqueda = useRef(null)
  function cancelarBusquedaPendiente() {
    if (temporizadorBusqueda.current) {
      clearTimeout(temporizadorBusqueda.current)
      temporizadorBusqueda.current = null
    }
  }
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [paginacion, setPaginacion] = useState({
    count: 0,
    next: null,
    previous: null,
  })

  const [pagina, setPagina] = useState(1)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [productoEditando, setProductoEditando] = useState(null)
  const [formulario, setFormulario] = useState({
    nombre: '',
    precio: '',
    stock: '',
    estado: true,
  })

  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [erroresCampos, setErroresCampos] = useState({})

  async function cargarProductos(
    numeroPagina = 1,
    terminoBusqueda = busqueda,
    estadoSeleccionado = filtroEstado
  ) {
    try {
      setActualizando(true)
      setError('')

      const parametros = new URLSearchParams()

      parametros.set('page', numeroPagina)

      if (terminoBusqueda.trim()) {
        parametros.set('search', terminoBusqueda.trim())
      }

      if (estadoSeleccionado === 'activos') {
        parametros.set('estado', 'true')
      } else if (estadoSeleccionado === 'inactivos') {
        parametros.set('estado', 'false')
      }

      const datos = await apiRequest(
        `/api/productos/?${parametros.toString()}`
      )

      setProductos(datos.results ?? [])

      setPaginacion({
        count: datos.count ?? 0,
        next: datos.next ?? null,
        previous: datos.previous ?? null,
      })

      setPagina(numeroPagina)
    } catch (error) {
      setError(error.message || 'No se pudieron cargar los productos.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  async function registrarProducto(evento) {
    evento.preventDefault()

    const esEdicion = Boolean(productoEditando)

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')
      setErroresCampos({})

      await apiRequest(
        esEdicion
          ? `/api/productos/${productoEditando.id}/`
          : '/api/productos/',
        {
          method: esEdicion ? 'PATCH' : 'POST',
          body: JSON.stringify({
            nombre: formulario.nombre,
            precio: formulario.precio === '' ? null : formulario.precio,
            stock: formulario.stock === '' ? null : formulario.stock,
            estado: formulario.estado === true || formulario.estado === 'true',
          }),
        }
      )

      setFormulario({
        nombre: '',
        precio: '',
        stock: '',
        estado: true,
      })

      setProductoEditando(null)
      setMostrarFormulario(false)

      setMensajeExito(
        esEdicion
          ? 'Producto actualizado correctamente.'
          : 'Producto registrado correctamente.'
      )

      await cargarProductos(esEdicion ? pagina : 1)

    } catch (error) {

      const datosError = error.data

      if (datosError && typeof datosError === 'object') {

        const campos = [
          'nombre',
          'precio',
          'stock',
          'estado',
        ]

        const errores = {}

        campos.forEach((campo) => {
          if (datosError[campo]) {
            errores[campo] = Array.isArray(datosError[campo])
              ? datosError[campo][0]
              : datosError[campo]
          }
        })

        setErroresCampos(errores)

        if (datosError.detail) {
          setError(datosError.detail)
        } else if (Object.keys(errores).length === 0) {
          setError(error.message || 'No se pudo guardar el producto.')
        }

      } else {
        setError(error.message || 'No se pudo guardar el producto.')
      }

    } finally {
      setGuardando(false)
    }
  }

  function manejarCambio(evento) {
    const { name, value, type, checked } = evento.target

    let nuevoValor = value

    if (type === 'checkbox') {
      nuevoValor = checked
    } else if (type === 'number' && value !== '') {
      nuevoValor = Number(value)
    }

    setFormulario((datosAnteriores) => ({
      ...datosAnteriores,
      [name]: nuevoValor,
    }))
  }

  function prepararEdicion(producto) {
    setProductoEditando(producto)

    setFormulario({
      nombre: producto.nombre || '',
      precio: producto.precio ?? '',
      stock: producto.stock ?? '',
      estado: producto.estado === true || producto.estado === 'true',
    })

    setErroresCampos({})
    setError('')
    setMensajeExito('')
    setMostrarFormulario(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function desactivarProducto(producto) {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas desactivar el producto "${producto.nombre}"?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')

      await apiRequest(`/api/productos/${producto.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado: false,
        }),
      })

      setMensajeExito('Producto desactivado correctamente.')

      await cargarProductos(pagina)

    } catch (error) {
      setError(
        error.message || 'No se pudo desactivar el producto.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function reactivarProducto(producto) {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas reactivar el producto "${producto.nombre}"?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')

      await apiRequest(`/api/productos/${producto.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado: true,
        }),
      })

      setMensajeExito('Producto reactivado correctamente.')

      await cargarProductos(pagina)

    } catch (error) {
      setError(
        error.message || 'No se pudo reactivar el producto.'
      )
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    cargarProductos(1)
  }, [])

  const productosFiltrados = productos
  const totalPaginas = Math.max(1, Math.ceil(paginacion.count / 5))
  const puedeRetroceder = Boolean(paginacion.previous) && !actualizando
  const puedeAvanzar = Boolean(paginacion.next) && !actualizando

  if (cargando) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3 text-secondary">Cargando productos...</p>
      </div>
    )
  }

  return (
    <div className="page-heading productos-page">
      <div className="productos-header">
        <div>
          <h1>Productos</h1>
          <p>Administración de productos del catálogo.</p>
        </div>

        <div className="d-flex gap-2 flex-wrap">

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario)
              setProductoEditando(null)
              setFormulario({
                nombre: '',
                precio: '',
                stock: '',
                estado: true,
              })
              setErroresCampos({})
              setError('')
              setMensajeExito('')
            }}
          >
            <i className="bi bi-box-seam-fill me-2"></i>
            Nuevo producto
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => cargarProductos(pagina)}
            disabled={actualizando}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            {actualizando ? 'Actualizando...' : 'Actualizar'}
          </button>

        </div>
      </div>
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={() => cargarProductos(pagina)}
            disabled={actualizando}
          >
            Reintentar
          </button>
        </div>
      )}
      {mensajeExito && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="bi bi-check-circle me-2"></i>
          {mensajeExito}

          <button
            type="button"
            className="btn-close"
            onClick={() => setMensajeExito('')}
            aria-label="Cerrar"
          ></button>
        </div>
      )}

      {mostrarFormulario && (
        <div className="productos-tabla-card mb-4">

          <div className="productos-tabla-header">
            <div>
              <h2>
                {productoEditando ? 'Editar producto' : 'Registrar nuevo producto'}
              </h2>
              <p>Completa los datos para registrar un producto.</p>
            </div>
          </div>

          <div className="p-4">
            <form onSubmit={registrarProducto}>

              <div className="row g-3">

                <div className="col-md-6">
                  <label className="form-label">
                    Nombre
                  </label>

                  <input
                    type="text"
                    name="nombre"
                    className={`form-control ${erroresCampos.nombre ? 'is-invalid' : ''}`}
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    maxLength="100"
                    required
                    placeholder="Nombre del producto"
                  />

                  {erroresCampos.nombre && (
                    <div className="invalid-feedback">
                      {erroresCampos.nombre}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Precio
                  </label>

                  <input
                    type="number"
                    name="precio"
                    step="0.01"
                    min="0"
                    className={`form-control ${erroresCampos.precio ? 'is-invalid' : ''}`}
                    value={formulario.precio}
                    onChange={manejarCambio}
                    required
                    placeholder="Ej. 1500.00"
                  />

                  {erroresCampos.precio && (
                    <div className="invalid-feedback">
                      {erroresCampos.precio}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Stock
                  </label>

                  <input
                    type="number"
                    name="stock"
                    min="0"
                    className={`form-control ${erroresCampos.stock ? 'is-invalid' : ''}`}
                    value={formulario.stock}
                    onChange={manejarCambio}
                    required
                    placeholder="Ej. 50"
                  />

                  {erroresCampos.stock && (
                    <div className="invalid-feedback">
                      {erroresCampos.stock}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Estado del producto
                  </label>

                  <select
                    name="estado"
                    className={`form-select ${erroresCampos.estado ? 'is-invalid' : ''}`}
                    value={String(formulario.estado)}
                    onChange={(evento) =>
                      setFormulario((datosAnteriores) => ({
                        ...datosAnteriores,
                        estado: evento.target.value === 'true',
                      }))}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>

                  {erroresCampos.estado && (
                    <div className="invalid-feedback">
                      {erroresCampos.estado}
                    </div>
                  )}
                </div>

              </div>

              <hr className="my-4" />

              <div className="d-flex justify-content-end gap-2">

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setMostrarFormulario(false)
                    setProductoEditando(null)
                    setFormulario({
                      nombre: '',
                      precio: '',
                      stock: '',
                      estado: true,
                    })
                    setErroresCampos({})
                    setError('')
                    setMensajeExito('')
                  }}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-2"></i>
                      Guardar producto
                    </>
                  )}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
      <div className="productos-resumen">
        <div className="productos-resumen-icono">
          <i className="bi bi-box-seam"></i>
        </div>

        <div>
          <p className="productos-resumen-titulo">Total de productos</p>
          <h2>{paginacion.count}</h2>
        </div>
      </div>

      <div className="productos-tabla-card">
        <div className="productos-tabla-header">
          <div>
            <h2>Listado de productos</h2>
            <p>Consulta los productos registrados en el sistema.</p>
          </div>

          <div className="productos-buscador">
            <i className="bi bi-search"></i>

            <input
              type="search"
              className="form-control"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(evento) => {
                const nuevoValor = evento.target.value

                setBusqueda(nuevoValor)

                if (temporizadorBusqueda.current) {
                  clearTimeout(temporizadorBusqueda.current)
                }

                temporizadorBusqueda.current = setTimeout(() => {
                  cargarProductos(1, nuevoValor, filtroEstado)
                }, 400)
              }}
              aria-label="Buscar por nombre del producto"
            />
          </div>
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${filtroEstado === 'todos'
                ? 'btn-primary'
                : 'btn-outline-primary'
                }`}
              onClick={() => {
                cancelarBusquedaPendiente()

                setFiltroEstado('todos')
                cargarProductos(1, busqueda, 'todos')
              }}
            >
              Todos
            </button>

            <button
              type="button"
              className={`btn btn-sm ${filtroEstado === 'activos'
                ? 'btn-success'
                : 'btn-outline-success'
                }`}
              onClick={() => {
                cancelarBusquedaPendiente()

                setFiltroEstado('activos')
                cargarProductos(1, busqueda, 'activos')
              }}
            >
              Activos
            </button>

            <button
              type="button"
              className={`btn btn-sm ${filtroEstado === 'inactivos'
                ? 'btn-danger'
                : 'btn-outline-danger'
                }`}

              onClick={() => {
                cancelarBusquedaPendiente()

                setFiltroEstado('inactivos')
                cargarProductos(1, busqueda, 'inactivos')
              }}
            >
              Inactivos
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table productos-tabla align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((producto) => (
                <tr key={producto.id}>
                  <td className="text-secondary">#{producto.id}</td>
                  <td className="fw-semibold">
                    {producto.nombre || '—'}
                  </td>
                  <td>Bs. {producto.precio || '—'}</td>
                  <td>{producto.stock || '—'}</td>

                  <td>
                    <span
                      className={`producto-estado ${producto.estado ? 'activo' : 'inactivo'}`}
                    >
                      <span className="producto-estado-punto"></span>
                      {producto.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => prepararEdicion(producto)}
                      disabled={actualizando || guardando}
                      title="Editar producto"
                    >
                      <i className="bi bi-pencil-square"></i>
                      <span className="ms-1">Editar</span>
                    </button>
                    {producto.estado ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm ms-2"
                        onClick={() => desactivarProducto(producto)}
                        disabled={actualizando || guardando}
                        title="Desactivar producto"
                      >
                        <i className="bi bi-box-seam-fill"></i>
                        <span className="ms-1">Desactivar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm ms-2"
                        onClick={() => reactivarProducto(producto)}
                        disabled={actualizando || guardando}
                        title="Reactivar producto"
                      >
                        <i className="bi bi-box-seam-fill"></i>
                        <span className="ms-1">Reactivar</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <i className="bi bi-search fs-3 text-secondary"></i>

                    <p className="mt-2 mb-1 fw-semibold">
                      No se encontraron productos
                    </p>

                    <p className="text-secondary mb-0">
                      {busqueda || filtroEstado !== 'todos'
                        ? 'No se encontraron productos con los criterios seleccionados.'
                        : 'Todavía no hay productos registrados.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="productos-tabla-footer d-flex justify-content-between align-items-center flex-wrap gap-3">
          <span>
            Página {pagina} de {totalPaginas} · {paginacion.count} productos en total
          </span>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => cargarProductos(pagina - 1)}
              disabled={!puedeRetroceder}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Anterior
            </button>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => cargarProductos(pagina + 1)}
              disabled={!puedeAvanzar}
            >
              Siguiente
              <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
