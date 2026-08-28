import { useEffect, useState } from 'react'
import { useApp } from './state/AppContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import PinModal from './components/PinModal'
import Toasts from './components/Toasts'
import Login from './components/Login'
import PosView from './views/PosView'
import CajaView from './views/CajaView'
import PersonalView from './views/PersonalView'
import CatalogoView from './views/CatalogoView'
import ClientesView from './views/ClientesView'
import DashboardView from './views/DashboardView'

const VIEWS = {
  pos: PosView,
  caja: CajaView,
  personal: PersonalView,
  catalogo: CatalogoView,
  clientes: ClientesView,
  dashboard: DashboardView
}

export default function App() {
  const { currentUser } = useApp()
  const [view, setView] = useState('pos')

  useEffect(() => {
    if (currentUser && view === 'dashboard' && currentUser.role === 'vendedor') {
      setView('pos')
    }
  }, [currentUser, view])

  useEffect(() => {
    setView('pos')
  }, [currentUser?.id])

  if (!currentUser) {
    return (
      <>
        <Login />
        <PinModal />
        <Toasts />
      </>
    )
  }

  const View = VIEWS[view]

  return (
    <div className="shell">
      <Sidebar view={view} setView={setView} />
      <div className="main">
        <Topbar view={view} />
        <main className="content">
          <View navigate={setView} />
        </main>
      </div>
      <PinModal />
      <Toasts />
    </div>
  )
}
