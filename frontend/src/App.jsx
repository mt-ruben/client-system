
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import Clientes from './pages/Clientes'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

function ModuloPendiente({ titulo }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{titulo}</h1>
        <p>Este módulo se implementará en el siguiente paso.</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/clientes"
              element={<Clientes />}
            />
            <Route
              path="/productos"
              element={<ModuloPendiente titulo="Productos" />}
            />
            <Route
              path="/pedidos"
              element={<ModuloPendiente titulo="Pedidos" />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
