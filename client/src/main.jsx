// client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { Dashboard }      from './pages/Dashboard.jsx'
import { AdminDashboard } from './pages/AdminDashboard.jsx'
import { Login }          from './pages/Login.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Login />} />
        <Route path="/app"    element={<Dashboard />} />
        <Route path="/admin"  element={<AdminDashboard />} />
        <Route path="*"       element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
