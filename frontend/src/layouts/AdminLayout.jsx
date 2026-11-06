
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
