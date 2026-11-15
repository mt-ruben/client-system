import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../services/api'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
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
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [formulario, setFormulario] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    rol: 'responsable',
    password: '',
    confirm_password: '',
  })

  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [erroresCampos, setErroresCampos] = useState({})

  const esEdicion = Boolean(usuarioEditando)

  async function cargarUsuarios(
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
        parametros.set('is_active', 'true')
      } else if (estadoSeleccionado === 'inactivos') {
        parametros.set('is_active', 'false')
      }

      const datos = await apiRequest(
        `/api/usuarios/?${parametros.toString()}`
      )

      setUsuarios(datos.results ?? [])

      setPaginacion({
        count: datos.count ?? 0,
        next: datos.next ?? null,
        previous: datos.previous ?? null,
      })

      setPagina(numeroPagina)
    } catch (error) {
      setError(error.message || 'No se pudieron cargar los usuarios.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  async function registrarUsuario(evento) {
    evento.preventDefault()

    // Validar que las contraseñas coincidan en creación de usuario
    if (!esEdicion) {
      if (formulario.password !== formulario.confirm_password) {
        setErroresCampos({
          confirm_password: 'Las contraseñas no coinciden.',
        })
        setError('Las contraseñas no coinciden. Verifica los datos.')
        setGuardando(false)
        return
      }

      if (!formulario.password || !formulario.confirm_password) {
        setErroresCampos({
          password: 'La contraseña es obligatoria.',
          confirm_password: 'La confirmación de contraseña es obligatoria.',
        })
        setError('Completa ambos campos de contraseña.')
        setGuardando(false)
        return
      }
    }

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')
      setErroresCampos({})

      const datosUsuario = {
        username: formulario.username,
        email: formulario.email,
        first_name: formulario.first_name,
        last_name: formulario.last_name,
        rol: formulario.rol,
      }

      // Solo incluir password en creación o si se modificó
      if (!esEdicion || formulario.password) {
        datosUsuario.password = formulario.password
      }

      await apiRequest(
        esEdicion
          ? `/api/usuarios/${usuarioEditando.id}/`
          : '/api/usuarios/',
        {
          method: esEdicion ? 'PATCH' : 'POST',
          body: JSON.stringify(datosUsuario),
        }
      )

      setFormulario({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        rol: 'responsable',
        password: '',
        confirm_password: '',
      })

      setUsuarioEditando(null)
      setMostrarFormulario(false)

      setMensajeExito(
        esEdicion
          ? 'Usuario actualizado correctamente.'
          : 'Usuario registrado correctamente.'
      )

      await cargarUsuarios(esEdicion ? pagina : 1)

    } catch (error) {

      const datosError = error.data

      if (datosError && typeof datosError === 'object') {

        const campos = [
          'username',
          'email',
          'first_name',
          'last_name',
          'rol',
          'password',
          'confirm_password',
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
          setError(error.message || 'No se pudo guardar el usuario.')
        }

      } else {
        setError(error.message || 'No se pudo guardar el usuario.')
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

  function prepararEdicion(usuario) {
    setUsuarioEditando(usuario)

    setFormulario({
      username: usuario.username || '',
      email: usuario.email || '',
      first_name: usuario.first_name || '',
      last_name: usuario.last_name || '',
      rol: usuario.is_staff ? 'administrador' : 'responsable',
      password: '',
      confirm_password: '',
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

  async function desactivarUsuario(usuario) {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas desactivar al usuario "${usuario.username}"?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')

      await apiRequest(`/api/usuarios/${usuario.id}/desactivar/`, {
        method: 'POST',
      })

      setMensajeExito('Usuario desactivado correctamente.')

      await cargarUsuarios(pagina)

    } catch (error) {
      setError(
        error.message || 'No se pudo desactivar el usuario.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function activarUsuario(usuario) {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas activar al usuario "${usuario.username}"?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')
      setMensajeExito('')

      await apiRequest(`/api/usuarios/${usuario.id}/activar/`, {
        method: 'POST',
      })

      setMensajeExito('Usuario activado correctamente.')

      await cargarUsuarios(pagina)

    } catch (error) {
      setError(
        error.message || 'No se pudo activar el usuario.'
      )
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios(1)
  }, [])

  const usuariosFiltrados = usuarios
  const totalPaginas = Math.max(1, Math.ceil(paginacion.count / 5))
  const puedeRetroceder = Boolean(paginacion.previous) && !actualizando
  const puedeAvanzar = Boolean(paginacion.next) && !actualizando

  if (cargando) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3 text-secondary">Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <div className="page-heading usuarios-page">
      <div className="usuarios-header">
        <div>
          <h1>Usuarios</h1>
          <p>Administración de usuarios del sistema.</p>
        </div>

        <div className="d-flex gap-2 flex-wrap">

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario)
              setUsuarioEditando(null)
              setFormulario({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                rol: 'responsable',
                password: '',
                confirm_password: '',
              })
              setErroresCampos({})
              setError('')
              setMensajeExito('')
            }}
          >
            <i className="bi bi-person-plus me-2"></i>
            Nuevo usuario
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => cargarUsuarios(pagina)}
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
            onClick={() => cargarUsuarios(pagina)}
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
        <div className="usuarios-tabla-card mb-4">

          <div className="usuarios-tabla-header">
            <div>
              <h2>
                {usuarioEditando ? 'Editar usuario' : 'Registrar nuevo usuario'}
              </h2>
              <p>Completa los datos para registrar un usuario.</p>
            </div>
          </div>

          <div className="p-4">
            <form onSubmit={registrarUsuario}>

              <div className="row g-3">

                <div className="col-md-6">
                  <label className="form-label">
                    Nombre de usuario
                  </label>

                  <input
                    type="text"
                    name="username"
                    className={`form-control ${erroresCampos.username ? 'is-invalid' : ''}`}
                    value={formulario.username}
                    onChange={manejarCambio}
                    maxLength="150"
                    required
                    placeholder="usuario"
                  />

                  {erroresCampos.username && (
                    <div className="invalid-feedback">
                      {erroresCampos.username}
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
                    className={`form-control ${erroresCampos.email ? 'is-invalid' : ''}`}
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
                    Nombres
                  </label>

                  <input
                    type="text"
                    name="first_name"
                    className={`form-control ${erroresCampos.first_name ? 'is-invalid' : ''}`}
                    value={formulario.first_name}
                    onChange={manejarCambio}
                    maxLength="150"
                    placeholder="Nombres"
                  />

                  {erroresCampos.first_name && (
                    <div className="invalid-feedback">
                      {erroresCampos.first_name}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Apellidos
                  </label>

                  <input
                    type="text"
                    name="last_name"
                    className={`form-control ${erroresCampos.last_name ? 'is-invalid' : ''}`}
                    value={formulario.last_name}
                    onChange={manejarCambio}
                    maxLength="150"
                    placeholder="Apellidos"
                  />

                  {erroresCampos.last_name && (
                    <div className="invalid-feedback">
                      {erroresCampos.last_name}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Rol
                  </label>

                  <select
                    name="rol"
                    className={`form-select ${erroresCampos.rol ? 'is-invalid' : ''}`}
                    value={formulario.rol}
                    onChange={manejarCambio}
                  >
                    <option value="responsable">Responsable</option>
                    <option value="administrador">Administrador</option>
                  </select>

                  {erroresCampos.rol && (
                    <div className="invalid-feedback">
                      {erroresCampos.rol}
                    </div>
                  )}
                </div>

                {!usuarioEditando && (
                  <div className="col-md-6">
                    <label className="form-label">
                      Contraseña
                    </label>

                    <input
                      type="password"
                      name="password"
                      className={`form-control ${erroresCampos.password ? 'is-invalid' : ''}`}
                      value={formulario.password}
                      onChange={manejarCambio}
                      minLength="8"
                      required
                      placeholder="••••••••"
                    />

                    {erroresCampos.password && (
                      <div className="invalid-feedback">
                        {erroresCampos.password}
                      </div>
                    )}

                    <small className="text-secondary">
                      Mínimo 8 caracteres.
                    </small>
                  </div>
                )}

                {!usuarioEditando && (
                  <div className="col-md-6">
                    <label className="form-label">
                      Confirmar contraseña
                    </label>

                    <input
                      type="password"
                      name="confirm_password"
                      className={`form-control ${erroresCampos.confirm_password ? 'is-invalid' : ''}`}
                      value={formulario.confirm_password}
                      onChange={manejarCambio}
                      minLength="8"
                      required
                      placeholder="••••••••"
                    />

                    {erroresCampos.confirm_password && (
                      <div className="invalid-feedback">
                        {erroresCampos.confirm_password}
                      </div>
                    )}

                    <small className="text-secondary">
                      Confirma tu contraseña.
                    </small>
                  </div>
                )}

                {usuarioEditando && (
                  <div className="col-md-6">
                    <label className="form-label">
                      Contraseña (opcional)
                    </label>

                    <input
                      type="password"
                      name="password"
                      className={`form-control ${erroresCampos.password ? 'is-invalid' : ''}`}
                      value={formulario.password}
                      onChange={manejarCambio}
                      minLength="8"
                      placeholder="••••••••"
                    />

                    {erroresCampos.password && (
                      <div className="invalid-feedback">
                        {erroresCampos.password}
                      </div>
                    )}

                    <small className="text-secondary">
                      Déjalo vacío para mantener la contraseña actual.
                    </small>
                  </div>
                )}

              </div>

              <hr className="my-4" />

              <div className="d-flex justify-content-end gap-2">

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setMostrarFormulario(false)
                    setUsuarioEditando(null)
                    setFormulario({
                      username: '',
                      email: '',
                      first_name: '',
                      last_name: '',
                      rol: 'responsable',
                      password: '',
                      confirm_password: '',
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
                      {esEdicion ? 'Actualizar usuario' : 'Guardar usuario'}
                    </>
                  )}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
      <div className="usuarios-resumen">
        <div className="usuarios-resumen-icono">
          <i className="bi bi-people"></i>
        </div>

        <div>
          <p className="usuarios-resumen-titulo">Total de usuarios</p>
          <h2>{paginacion.count}</h2>
        </div>
      </div>

      <div className="usuarios-tabla-card">
        <div className="usuarios-tabla-header">
          <div>
            <h2>Listado de usuarios</h2>
            <p>Consulta los usuarios registrados en el sistema.</p>
          </div>

          <div className="usuarios-buscador">
            <i className="bi bi-search"></i>

            <input
              type="search"
              className="form-control"
              placeholder="Buscar por nombre de usuario o correo..."
              value={busqueda}
              onChange={(evento) => {
                const nuevoValor = evento.target.value

                setBusqueda(nuevoValor)

                if (temporizadorBusqueda.current) {
                  clearTimeout(temporizadorBusqueda.current)
                }

                temporizadorBusqueda.current = setTimeout(() => {
                  cargarUsuarios(1, nuevoValor, filtroEstado)
                }, 400)
              }}
              aria-label="Buscar por nombre de usuario o correo electrónico"
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
                cargarUsuarios(1, busqueda, 'todos')
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
                cargarUsuarios(1, busqueda, 'activos')
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
                cargarUsuarios(1, busqueda, 'inactivos')
              }}
            >
              Inactivos
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table usuarios-tabla align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Correo electrónico</th>
                <th>Nombre completo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id}>
                  <td className="text-secondary">#{usuario.id}</td>
                  <td className="fw-semibold">
                    {usuario.username || '—'}
                  </td>
                  <td>{usuario.email || '—'}</td>
                  <td>
                    {
                      ((usuario.first_name || '') + ' ' + (usuario.last_name || '')).trim() || '—'
                    }
                  </td>
                  <td>
                    <span className={`usuario-rol ${usuario.is_staff ? 'administrador' : 'responsable'}`}>
                      {usuario.is_staff ? 'Administrador' : 'Responsable'}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`usuario-estado ${usuario.is_active ? 'activo' : 'inactivo'}`}
                    >
                      <span className="usuario-estado-punto"></span>
                      {usuario.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => prepararEdicion(usuario)}
                      disabled={actualizando || guardando}
                      title="Editar usuario"
                    >
                      <i className="bi bi-pencil-square"></i>
                      <span className="ms-1">Editar</span>
                    </button>
                    {usuario.is_active ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm ms-2"
                        onClick={() => desactivarUsuario(usuario)}
                        disabled={actualizando || guardando}
                        title="Desactivar usuario"
                      >
                        <i className="bi bi-person-x"></i>
                        <span className="ms-1">Desactivar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm ms-2"
                        onClick={() => activarUsuario(usuario)}
                        disabled={actualizando || guardando}
                        title="Activar usuario"
                      >
                        <i className="bi bi-person-check"></i>
                        <span className="ms-1">Activar</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <i className="bi bi-search fs-3 text-secondary"></i>

                    <p className="mt-2 mb-1 fw-semibold">
                      No se encontraron usuarios
                    </p>

                    <p className="text-secondary mb-0">
                      {busqueda || filtroEstado !== 'todos'
                        ? 'No se encontraron usuarios con los criterios seleccionados.'
                        : 'Todavía no hay usuarios registrados.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="usuarios-tabla-footer d-flex justify-content-between align-items-center flex-wrap gap-3">
          <span>
            Página {pagina} de {totalPaginas} · {paginacion.count} usuarios en total
          </span>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => cargarUsuarios(pagina - 1)}
              disabled={!puedeRetroceder}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Anterior
            </button>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => cargarUsuarios(pagina + 1)}
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
