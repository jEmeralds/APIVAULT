// client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import './index.css'
import { Dashboard }      from './pages/Dashboard.jsx'
import { AdminDashboard } from './pages/AdminDashboard.jsx'
import { Login }          from './pages/Login.jsx'

// Redirect /verify?token=xxx to /?token=xxx so Login.jsx handles it
function VerifyRedirect() {
  const location = useLocation()
  return <Navigate to={`/${location.search}`} replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Login />} />
        <Route path="/verify" element={<VerifyRedirect />} />
        <Route path="/app"    element={<Dashboard />} />
        <Route path="/admin"  element={<AdminDashboard />} />
        <Route path="*"       element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)