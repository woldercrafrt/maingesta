import React, { useState, useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import AlmacenesPage from './pages/AlmacenesPage'
import AdminPage from './pages/AdminPage'
import AlmacenVisualizerPage from './pages/AlmacenVisualizerPage'
import ArmarioVisualizerPage from './pages/ArmarioVisualizerPage'
import SuscripcionPage from './pages/SuscripcionPage'
import CatalogoPage from './pages/CatalogoPage'
import ProductoDetailPage from './pages/ProductoDetailPage'
import KardexPage from './pages/KardexPage'
import { AuthProvider, useAuth } from './context/AuthContext'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role, isLoading } = useAuth()

  if (isLoading) {
    return <div className="page loading-container"><div className="loading-spinner" /></div>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />
  }

  return children
}

const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const [isManualTheme, setIsManualTheme] = useState(() => {
    return Boolean(localStorage.getItem('stock pocket-theme'))
  })
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('stock pocket-theme') || getSystemTheme()
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (isManualTheme) {
      localStorage.setItem('stock pocket-theme', theme)
    } else {
      localStorage.removeItem('stock pocket-theme')
    }
  }, [isManualTheme, theme])

  useEffect(() => {
    if (isManualTheme || typeof window === 'undefined' || !window.matchMedia) {
      return undefined
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event) => {
      setTheme(event.matches ? 'dark' : 'light')
    }
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [isManualTheme])

  const handleThemeChange = (nextTheme) => {
    setIsManualTheme(true)
    setTheme(nextTheme)
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<LoginPage theme={theme} onThemeChange={handleThemeChange} />}
          />
          <Route
            path="/login"
            element={<LoginPage theme={theme} onThemeChange={handleThemeChange} />}
          />
          <Route
            path="/home"
            element={<HomePage theme={theme} onThemeChange={handleThemeChange} />}
          />
          <Route
            path="/almacenes"
            element={
              <ProtectedRoute>
                <AlmacenesPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios-roles"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ADMIN_EMPRESA']}>
                <AdminPage
                  theme={theme}
                  onThemeChange={handleThemeChange}
                  mode="users-roles"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/almacen/:id"
            element={
              <ProtectedRoute>
                <AlmacenVisualizerPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/armario/:id"
            element={
              <ProtectedRoute>
                <ArmarioVisualizerPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suscripcion"
            element={
              <ProtectedRoute>
                <SuscripcionPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogo"
            element={
              <ProtectedRoute>
                <CatalogoPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogo/:id"
            element={
              <ProtectedRoute>
                <ProductoDetailPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kardex"
            element={
              <ProtectedRoute>
                <KardexPage theme={theme} onThemeChange={handleThemeChange} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
