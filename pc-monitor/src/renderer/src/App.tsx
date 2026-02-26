import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CPU from './pages/CPU'
import RAM from './pages/RAM'
import GPU from './pages/GPU'
import Storage from './pages/Storage'
import Temperature from './pages/Temperature'
import Battery from './pages/Battery'
import Network from './pages/Network'
import Processes from './pages/Processes'
import History from './pages/History'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

function App() {
  return (
    <div className="dark">
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cpu" element={<CPU />} />
            <Route path="/ram" element={<RAM />} />
            <Route path="/gpu" element={<GPU />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/temperature" element={<Temperature />} />
            <Route path="/battery" element={<Battery />} />
            <Route path="/network" element={<Network />} />
            <Route path="/processes" element={<Processes />} />
            <Route path="/history" element={<History />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </HashRouter>
    </div>
  )
}

export default App