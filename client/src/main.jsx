// client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import { Landing }        from './pages/Landing.jsx'
import { Login }          from './pages/Login.jsx'
import { Dashboard }      from './pages/Dashboard.jsx'
import { AdminDashboard } from './pages/AdminDashboard.jsx'

// Redirect /verify?token=xxx to /login?token=xxx so Login.jsx handles it
function VerifyRedirect() {
  const location = useLocation()
  return <Navigate to={`/login${location.search}`} replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Landing />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/verify" element={<VerifyRedirect />} />
        <Route path="/app"    element={<Dashboard />} />
        <Route path="/admin"  element={<AdminDashboard />} />
        <Route path="*"       element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)