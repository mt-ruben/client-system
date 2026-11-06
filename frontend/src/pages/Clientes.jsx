import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../services/api'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
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
  // Controla la visibilidad del formulario.
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  // Almacena el cliente que se está editando.
  const [clienteEditando, setClienteEditando] = useState(null)
  // Guarda los datos del nuevo cliente.
  const [formulario, setFormulario] = useState({
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    estado: true,
  })

  // Controla el envío del formulario.
  const [guardando, setGuardando] = useState(false)

  // Mensajes de confirmación.
  const [mensajeExito, setMensajeExito] = useState('')
  const [erroresCampos, setErroresCampos] = useState({})
  async function cargarClientes(
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

        `/clientes/?${parametros.toString()}`
      )

      setClientes(datos.results ?? [])

      setPaginacion({
        count: datos.count ?? 0,
        next: datos.next ?? null,
        previous: datos.previous ?? null,
      })

      setPagina(numeroPagina)
    } catch (error) {
      setError(error.message || 'No se pudieron cargar los clientes.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }
  async function registrarCliente(evento) {
    evento.preventDefault()

    const esEdicion = Boolean(clienteEditando)

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')
      setErroresCampos({})

      await apiRequest(
        esEdicion
          ? `/api/clientes/${clienteEditando.id}/`
          : '/api/clientes/',
        {
          method: esEdicion ? 'PATCH' : 'POST',
          body: JSON.stringify(formulario),
        }
      )

      // Limpiar el formulario.
      setFormulario({
        nombre: '',
        empresa: '',
        email: '',
        telefono: '',
        estado: true,
      })

      // Limpiar el cliente seleccionado.
      setClienteEditando(null)

      // Cerrar el formulario.
      setMostrarFormulario(false)

      // Mostrar confirmación.
      setMensajeExito(
        esEdicion
          ? 'Cliente actualizado correctamente.'
          : 'Cliente registrado correctamente.'
      )

      // Actualizar el listado.
      await cargarClientes(esEdicion ? pagina : 1)

    } catch (error) {

      const datosError = error.data

      if (datosError && typeof datosError === 'object') {

        const campos = [
          'nombre',
          'empresa',
          'email',
          'telefono',
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
          setError(error.message || 'No se pudo guardar el cliente.')
        }

      } else {
        setError(error.message || 'No se pudo guardar el cliente.')
      }

    } finally {
      setGuardando(false)
    }
  }
  function manejarCambio(evento) {
    const { name, value, type, checked } = evento.target

    setFormulario((datosAnteriores) => ({
      ...datosAnteriores,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }
  function prepararEdicion(cliente) {
    // Guardar el cliente seleccionado.
    setClienteEditando(cliente)

    // Cargar sus datos en el formulario.
    setFormulario({
      nombre: cliente.nombre || '',
      empresa: cliente.empresa || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      estado: cliente.estado,
    })

    // Limpiar errores anteriores.
    setErroresCampos({})
    setError('')
    setMensajeExito('')

    // Mostrar el formulario.
    setMostrarFormulario(true)

    // Desplazar la página hacia arriba.
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }
  async function desactivarCliente(cliente) {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas desactivar al cliente "${cliente.nombre}"?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')

      await apiRequest(`/api/clientes/${cliente.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado: false,
        }),
      })

      setMensajeExito('Cliente desactivado correctamente.')

      await cargarClientes(pagina)

    } catch (error) {
      setError(
        error.message || 'No se pudo desactivar el cliente.'
      )
    } finally {
      setGuardando(false)
    }
  }
  async function reactivarCliente(cliente) {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas reactivar al cliente "${cliente.nombre}"?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')

      await apiRequest(`/api/clientes/${cliente.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado: true,
        }),
      })

      setMensajeExito('Cliente reactivado correctamente.')

      await cargarClientes(pagina)

    } catch (error) {
      setError(
        error.message || 'No se pudo reactivar el cliente.'
      )
    } finally {
      setGuardando(false)
    }
  }
  useEffect(() => {
    cargarClientes(1)
  }, [])


 
  const clientesFiltrados = clientes
  const totalPaginas = Math.max( 1,Math.ceil(paginacion.count / 5))
  const puedeRetroceder = Boolean(paginacion.previous) && !actualizando
  const puedeAvanzar = Boolean(paginacion.next) && !actualizando

  if (cargando) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3 text-secondary">Cargando clientes...</p>
      </div>
    )
  }

  return (
    <div className="page-heading clientes-page">
      <div className="clientes-header">
        <div>
          <h1>Clientes</h1>
          <p>Administración de clientes registrados.</p>
        </div>

        <div className="d-flex gap-2 flex-wrap">

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario)
              setClienteEditando(null)
              setFormulario({
                nombre: '',
                empresa: '',
                email: '',
                telefono: '',
                estado: true,
              })
              setErroresCampos({})
              setError('')
              setMensajeExito('')
            }}
          >
            <i className="bi bi-person-plus me-2"></i>
            Nuevo cliente
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => cargarClientes(pagina)}
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
            onClick={() => cargarClientes(pagina)}
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
        <div className="clientes-tabla-card mb-4">

          <div className="clientes-tabla-header">
            <div>
              <h2>
                {clienteEditando ? 'Editar cliente' : 'Registrar nuevo cliente'}
              </h2>
              <p>Completa los datos para registrar un cliente.</p>
            </div>
          </div>

          <div className="p-4">
            <form onSubmit={registrarCliente}>

              <div className="row g-3">

                <div className="col-md-6">
                  <label className="form-label">
                    Nombre
                  </label>

                  <input
                    type="text"
                    name="nombre"
                    className={`form-control ${erroresCampos.nombre ? 'is-invalid' : ''
                      }`}
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    maxLength="30"
                    required
                    placeholder="Nombre del cliente"
                  />

                  {erroresCampos.nombre && (
                    <div className="invalid-feedback">
                      {erroresCampos.nombre}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Empresa
                  </label>

                  <input
                    type="text"
                    name="empresa"
                    className={`form-control ${erroresCampos.empresa ? 'is-invalid' : ''
                      }`}
                    value={formulario.empresa}
                    onChange={manejarCambio}
                    maxLength="100"
                    required
                    placeholder="Nombre de la empresa"
                  />

                  {erroresCampos.empresa && (
                    <div className="invalid-feedback">
                      {erroresCampos.empresa}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Correo electrónico
                  </label>

                  <input
                    type="email"
                    name="email"
                    className={`form-control ${erroresCampos.email ? 'is-invalid' : ''
                      }`}
                    value={formulario.email}
                    onChange={manejarCambio}
                    required
                    placeholder="correo@ejemplo.com"
                  />

                  {erroresCampos.email && (
                    <div className="invalid-feedback">
                      {erroresCampos.email}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Teléfono
                  </label>

                  <input
                    type="tel"
                    name="telefono"
                    className={`form-control ${erroresCampos.telefono ? 'is-invalid' : ''
                      }`}
                    value={formulario.telefono}
                    onChange={manejarCambio}
                    maxLength="8"
                    pattern="[0-9]{8}"
                    required={formulario.estado}
                    placeholder="Ej. 77712345"
                  />

                  {erroresCampos.telefono && (
                    <div className="invalid-feedback">
                      {erroresCampos.telefono}
                    </div>
                  )}

                  <small className="text-secondary">
                    Introduce exactamente 8 dígitos numéricos.
                  </small>


                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Estado del cliente
                  </label>

                  <select
                    name="estado"
                    className={`form-select ${erroresCampos.estado ? 'is-invalid' : ''
                      }`}
                    value={String(formulario.estado)}
                    onChange={(evento) =>
                      setFormulario((datosAnteriores) => ({
                        ...datosAnteriores,
                        estado: evento.target.value === 'true',
                      }))
                    }
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
                    setClienteEditando(null)
                    setFormulario({
                      nombre: '',
                      empresa: '',
                      email: '',
                      telefono: '',
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
                      Guardar cliente
                    </>
                  )}
                </button>

              </div>

            </form>
          </div>

        </div>
      )}
      <div className="clientes-resumen">
        <div className="clientes-resumen-icono">
          <i className="bi bi-people"></i>
        </div>

        <div>
          <p className="clientes-resumen-titulo">Total de clientes</p>
          <h2>{paginacion.count}</h2>
        </div>
      </div>

      <div className="clientes-tabla-card">
        <div className="clientes-tabla-header">
          <div>
            <h2>Listado de clientes</h2>
            <p>Consulta los clientes registrados en el sistema.</p>
          </div>

          <div className="clientes-buscador">
            <i className="bi bi-search"></i>

            <input
              type="search"
              className="form-control"
              placeholder="Buscar por nombre, empresa o correo..."
              value={busqueda}
              onChange={(evento) => {
                const nuevoValor = evento.target.value

                setBusqueda(nuevoValor)

                if (temporizadorBusqueda.current) {
                  clearTimeout(temporizadorBusqueda.current)
                }

                temporizadorBusqueda.current = setTimeout(() => {
                  cargarClientes(1, nuevoValor, filtroEstado)
                }, 400)
              }}
              aria-label="Buscar por nombre, empresa o correo electrónico"
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
                cargarClientes(1, busqueda, 'todos')
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
                cargarClientes(1, busqueda, 'activos')
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
                cargarClientes(1, busqueda, 'inactivos')
              }}

            >
              Inactivos
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table clientes-tabla align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Empresa</th>
                <th>Correo electrónico</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Fecha de registro</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="text-secondary">#{cliente.id}</td>
                  <td className="fw-semibold">
                    {cliente.nombre || '—'}
                  </td>
                  <td>{cliente.empresa || '—'}</td>
                  <td>{cliente.email || '—'}</td>
                  <td>{cliente.telefono || '—'}</td>

                  <td>
                    <span
                      className={`cliente-estado ${cliente.estado ? 'activo' : 'inactivo'
                        }`}
                    >
                      <span className="cliente-estado-punto"></span>
                      {cliente.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td>
                    {cliente.fecha_registro
                      ? new Date(
                        cliente.fecha_registro
                      ).toLocaleDateString('es-BO')
                      : '—'}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => prepararEdicion(cliente)}
                      disabled={actualizando || guardando}
                      title="Editar cliente"
                    >
                      <i className="bi bi-pencil-square"></i>
                      <span className="ms-1">Editar</span>
                    </button>
                    {cliente.estado ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm ms-2"
                        onClick={() => desactivarCliente(cliente)}
                        disabled={actualizando || guardando}
                        title="Desactivar cliente"
                      >
                        <i className="bi bi-person-x"></i>
                        <span className="ms-1">Desactivar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm ms-2"
                        onClick={() => reactivarCliente(cliente)}
                        disabled={actualizando || guardando}
                        title="Reactivar cliente"
                      >
                        <i className="bi bi-person-check"></i>
                        <span className="ms-1">Reactivar</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <i className="bi bi-search fs-3 text-secondary"></i>

                    <p className="mt-2 mb-1 fw-semibold">
                      No se encontraron clientes
                    </p>

                    <p className="text-secondary mb-0">
                      {busqueda || filtroEstado !== 'todos'
                        ? 'No se encontraron clientes con los criterios seleccionados.'
                        : 'Todavía no hay clientes registrados.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="clientes-tabla-footer d-flex justify-content-between align-items-center flex-wrap gap-3">
          <span>
            Página {pagina} de {totalPaginas} · {paginacion.count} clientes en total
          </span>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => cargarClientes(pagina - 1)}
              disabled={!puedeRetroceder}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Anterior
            </button>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => cargarClientes(pagina + 1)}
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
