import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import { backendBaseUrl } from '../utils/config'
import { useAuth } from '../context/AuthContext'

const CrearEmpresaPage = ({ theme, onThemeChange }) => {
  const navigate = useNavigate()
  const { token, user, role, refreshUser, logout } = useAuth()
  const [nombre, setNombre] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token || !user || !user.id || role === 'ADMIN') {
      setIsLoading(false)
      return
    }

    const headers = { Authorization: `Bearer ${token}` }
    const userId = user.id

    fetch(`${backendBaseUrl}/api/usuarios/${userId}/empresas`, { headers })
      .then((r) => {
        if (r.status === 401) {
          logout()
          throw new Error('UNAUTHORIZED')
        }
        if (!r.ok) {
          throw new Error('ERROR_EMPRESAS')
        }
        return r.json()
      })
      .then((lista) => {
        if (Array.isArray(lista) && lista.length > 0) {
          navigate('/home', { replace: true })
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false)
      })
  }, [token, user, role, navigate, logout])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!token) {
      return
    }
    if (!nombre.trim()) {
      return
    }
    if (isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)

    fetch(`${backendBaseUrl}/api/onboarding/empresa`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre: nombre.trim() }),
    })
      .then((r) => {
        if (r.status === 409) {
          throw new Error('CONFLICT')
        }
        if (r.status === 401) {
          logout()
          throw new Error('UNAUTHORIZED')
        }
        if (!r.ok) {
          throw new Error('ERROR_CREATE')
        }
        return r.json()
      })
      .then(async () => {
        await refreshUser()
        navigate('/home', { replace: true })
      })
      .catch((err) => {
        if (err && err.message === 'CONFLICT') {
          setError('Ya tienes una empresa asignada.')
          return
        }
        setError('No se pudo crear la empresa. Intenta de nuevo.')
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  if (isLoading) {
    return <div className="page loading-container"><div className="loading-spinner" /></div>
  }

  return (
    <main className="page">
      <section className="card onboarding-card">
        <header className="onboarding-header">
          <div className="onboarding-brand">
            <div className="admin-topbar-mark" />
            <div>
              <div className="onboarding-brand-title">Stock Pocket</div>
              <div className="onboarding-brand-subtitle">Configuración inicial</div>
            </div>
          </div>
          <div className="onboarding-header-right">
            <ThemeSelector theme={theme} onChange={onThemeChange} />
            <UserMenu />
          </div>
        </header>

        <div>
          <h1 className="title">Crea tu empresa</h1>
          <p className="subtitle">
            Para empezar, crea tu empresa. Se te asignará un plan gratuito y quedarás como administrador.
          </p>
        </div>

        {error && (
          <div className="onboarding-alert onboarding-alert--error">
            {error}
          </div>
        )}

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <label className="onboarding-label" htmlFor="empresa-nombre">
            Nombre de la empresa
          </label>
          <input
            id="empresa-nombre"
            type="text"
            placeholder="Ej: Mi negocio"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="organization"
          />

          <div className="onboarding-actions">
            <Link to="/home" className="theme-button">
              Volver
            </Link>
            <button
              type="submit"
              className="theme-button active"
              disabled={isSaving || !nombre.trim()}
            >
              {isSaving ? 'Creando…' : 'Crear empresa'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default CrearEmpresaPage
