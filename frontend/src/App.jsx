import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

export default function App() {
  const { token, login, logout } = useAuth()

  if (!DEV_BYPASS && !token) {
    return <Login onLogin={login} />
  }

  return <Dashboard token={DEV_BYPASS ? 'dev' : token} onLogout={logout} />
}
