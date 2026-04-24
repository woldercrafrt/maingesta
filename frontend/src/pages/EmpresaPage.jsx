import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MobileNavMenu from '../components/MobileNavMenu'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import LocalNavBar from '../components/LocalNavBar'
import { backendBaseUrl } from '../utils/config'
import { useAuth } from '../context/AuthContext'

const EmpresaPage = ({ theme, onThemeChange }) => {
  const { token, logout } = useAuth()
  const [empresas, setEmpresas] = useState([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(null)
  const [activeSection, setActiveSection] = useState('resumen')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileNavRef = useRef(null)
  const [empresaUsuarios, setEmpresaUsuarios] = useState([])
  const [empresaItems, setEmpresaItems] = useState([])
  const [priceDraftByItemId, setPriceDraftByItemId] = useState({})
  const [isSavingPriceId, setIsSavingPriceId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const selectedEmpresa = useMemo(() => {
    if (!selectedEmpresaId) return null
    return (empresas || []).find((e) => e.id === selectedEmpresaId) || null
  }, [empresas, selectedEmpresaId])

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    const loadEmpresas = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`${backendBaseUrl}/api/empresas`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          logout()
          throw new Error('Sesión expirada')
        }
        if (!res.ok) throw new Error('Error al cargar empresas')
        const data = await res.json()
        setEmpresas(Array.isArray(data) ? data : [])
        const first = Array.isArray(data) && data.length ? data[0] : null
        setSelectedEmpresaId(first?.id ?? null)
      } catch (err) {
        setError(err.message)
        setEmpresas([])
        setSelectedEmpresaId(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadEmpresas()
  }, [token, logout])

  useEffect(() => {
    if (!token || !selectedEmpresaId) {
      return
    }

    const loadUsuarios = async () => {
      try {
        const res = await fetch(`${backendBaseUrl}/api/empresas/${selectedEmpresaId}/usuarios`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          logout()
          throw new Error('Sesión expirada')
        }
        if (!res.ok) throw new Error('Error al cargar usuarios de la empresa')
        const data = await res.json()
        setEmpresaUsuarios(Array.isArray(data) ? data : [])
      } catch {
        setEmpresaUsuarios([])
      }
    }

    loadUsuarios()
  }, [selectedEmpresaId, token, logout])

  useEffect(() => {
    if (!token || !selectedEmpresaId) {
      return
    }

    const loadItems = async () => {
      try {
        const res = await fetch(`${backendBaseUrl}/api/items?empresaId=${selectedEmpresaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          logout()
          throw new Error('Sesión expirada')
        }
        if (!res.ok) throw new Error('Error al cargar items')
        const data = await res.json()
        const items = Array.isArray(data) ? data : []
        setEmpresaItems(items)
        setPriceDraftByItemId((prev) => {
          const next = { ...prev }
          for (const item of items) {
            if (item && item.id && next[item.id] === undefined) {
              next[item.id] = item.precio ?? ''
            }
          }
          return next
        })
      } catch {
        setEmpresaItems([])
        setPriceDraftByItemId({})
      }
    }

    loadItems()
  }, [selectedEmpresaId, token, logout])

  const onSavePrecio = (itemId) => {
    if (!token || !itemId) return

    const draft = priceDraftByItemId[itemId]
    const normalized = draft === '' || draft === null || draft === undefined ? null : Number(draft)
    if (normalized !== null && Number.isNaN(normalized)) {
      setError('Precio inválido')
      return
    }

    setIsSavingPriceId(itemId)
    fetch(`${backendBaseUrl}/api/items/${itemId}/precio`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ precio: normalized === null ? null : normalized }),
    })
      .then((res) => {
        if (res.status === 401) {
          logout()
          throw new Error('Sesión expirada')
        }
        return res.ok ? res.json() : Promise.reject(new Error('Error al guardar precio'))
      })
      .then((updated) => {
        if (!updated || !updated.id) return
        setEmpresaItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)))
        setPriceDraftByItemId((prev) => ({ ...prev, [updated.id]: updated.precio ?? '' }))
      })
      .catch((err) => setError(err?.message || 'Error al guardar precio'))
      .finally(() => setIsSavingPriceId(null))
  }

  const sections = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'precios', label: 'Precios' },
    { id: 'despachos', label: 'Despachos' },
  ]

  useEffect(() => {
    if (!mobileNavOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target)) {
        setMobileNavOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [mobileNavOpen])

  const renderSection = () => {
    if (isLoading) {
      return (
        <div className="admin-table-shell">
          <p>Cargando…</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="admin-table-shell">
          <p style={{ color: '#b91c1c' }}>{error}</p>
        </div>
      )
    }

    if (activeSection === 'usuarios') {
      return (
        <div className="admin-table-shell">
          <h3 style={{ margin: '0 0 10px 0' }}>Usuarios de la empresa</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID Usuario</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {empresaUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={2}>Sin usuarios.</td>
                </tr>
              ) : (
                empresaUsuarios.map((row) => (
                  <tr key={`${row.empresaId}-${row.usuarioId}`}>
                    <td>{row.usuarioId}</td>
                    <td>{row.rol || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (activeSection === 'precios') {
      return (
        <div className="admin-table-shell">
          <h3 style={{ margin: '0 0 10px 0' }}>Precios por item</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Estado</th>
                <th>Tamaño</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresaItems.length === 0 ? (
                <tr>
                  <td colSpan={5}>Sin items.</td>
                </tr>
              ) : (
                empresaItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.estado}</td>
                    <td>{item.tamanio}</td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceDraftByItemId[item.id] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setPriceDraftByItemId((prev) => ({ ...prev, [item.id]: value }))
                        }}
                        style={{ width: '120px' }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="theme-button"
                        onClick={() => onSavePrecio(item.id)}
                        disabled={isSavingPriceId === item.id}
                      >
                        {isSavingPriceId === item.id ? 'Guardando…' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (activeSection === 'despachos') {
      return (
        <div className="admin-table-shell">
          <h3 style={{ margin: '0 0 10px 0' }}>Historial de despachos</h3>
          <p className="admin-main-text" style={{ marginTop: 0 }}>
            Pendiente: registrar salidas y mostrar total mensual.
          </p>
        </div>
      )
    }

    return (
      <>
        <div className="admin-table-shell">
          <div className="admin-table-filters">
            <select
              value={selectedEmpresaId || ''}
              onChange={(event) => {
                const value = event.target.value
                setSelectedEmpresaId(value ? Number(value) : null)
              }}
            >
              {(empresas || []).map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
            <div />
            <div />
          </div>
        </div>

        <div className="admin-table-shell">
          <h3 style={{ margin: '0 0 10px 0' }}>Detalle</h3>
          <table className="admin-table">
            <tbody>
              <tr>
                <td style={{ width: '180px', fontWeight: 600 }}>Nombre</td>
                <td>{selectedEmpresa?.nombre || '-'}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', fontWeight: 600 }}>Usuarios</td>
                <td>{empresaUsuarios.length}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', fontWeight: 600 }}>Items</td>
                <td>{empresaItems.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <main className="page admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-topbar-mark" />
          <span className="admin-topbar-title">Stock Pocket</span>
        </div>
        <div className="admin-header-right">
          <MobileNavMenu />
          <Link to="/home" className="theme-button">
            Home
          </Link>
          <ThemeSelector theme={theme} onChange={onThemeChange} />
          <UserMenu />
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar admin-sidebar-mobile-hidden">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-logo" />
            <div className="admin-sidebar-title">Empresa</div>
          </div>
          <div className="admin-sidebar-nav admin-sidebar-nav-desktop">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`admin-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="admin-main">
          <div className="admin-section-mobile-nav admin-sidebar-nav-mobile" ref={mobileNavRef}>
            <button
              type="button"
              className={`admin-nav-dropdown-trigger ${mobileNavOpen ? 'open' : ''}`}
              onClick={() => setMobileNavOpen((current) => !current)}
              aria-expanded={mobileNavOpen}
            >
              <span>
                {sections.find((section) => section.id === activeSection)?.label || 'Seleccionar sección'}
              </span>
            </button>
            {mobileNavOpen && (
              <div className="admin-nav-dropdown-menu">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`admin-nav-dropdown-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSection(section.id)
                      setMobileNavOpen(false)
                    }}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <h2 className="admin-main-title">Empresa</h2>
          <p className="admin-main-text">Configuración y reportes de tu empresa.</p>

          <LocalNavBar />

          {renderSection()}
        </div>
      </div>
    </main>
  )
}

export default EmpresaPage
