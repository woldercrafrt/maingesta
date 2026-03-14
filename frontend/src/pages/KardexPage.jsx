import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import LocalNavBar from '../components/LocalNavBar'
import { useAuth } from '../context/AuthContext'
import { backendBaseUrl } from '../utils/config'

const KardexPage = ({ theme, onThemeChange }) => {
  const navigate = useNavigate()
  const { token, canView } = useAuth()
  const [empresas, setEmpresas] = useState([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [movimientos, setMovimientos] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [viewMode, setViewMode] = useState('cards')

  const loadEmpresas = useCallback(async () => {
    try {
      const res = await fetch(`${backendBaseUrl}/api/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Error al cargar empresas')
      const data = await res.json()
      setEmpresas(data)
      if (data.length > 0) {
        setSelectedEmpresaId(data[0].id.toString())
      }
    } catch (err) {
      setError(err.message)
    }
  }, [token])

  const loadMovimientos = useCallback(async () => {
    if (!selectedEmpresaId) return
    setIsLoading(true)
    setError(null)
    try {
      const tipoQuery = filtroTipo ? `&tipo=${filtroTipo}` : ''
      const res = await fetch(`${backendBaseUrl}/api/kardex?empresaId=${selectedEmpresaId}&page=${page}&size=50${tipoQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Error al cargar el kárdex')
      const data = await res.json()
      setMovimientos(data.content || [])
      setTotalPages(data.totalPages || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedEmpresaId, page, filtroTipo])

  useEffect(() => {
    loadEmpresas()
  }, [loadEmpresas])

  useEffect(() => {
    loadMovimientos()
  }, [loadMovimientos])

  if (!canView('KARDEX', 1)) {
    return (
      <div className="page" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No tienes permiso para ver el kárdex</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/home')}>
          Volver
        </button>
      </div>
    )
  }

  return (
    <main className="page admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-topbar-mark" />
          <span className="admin-topbar-title">Kárdex</span>
        </div>
        <div className="admin-header-right">
          <ThemeSelector theme={theme} onThemeChange={onThemeChange} />
          <UserMenu />
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-logo" />
            <div className="admin-sidebar-title">Kárdex</div>
          </div>
          <div className="admin-sidebar-nav admin-sidebar-nav-desktop">
            <button type="button" className="admin-nav-item active">
              Movimientos
            </button>
          </div>
        </aside>
        <div className="admin-main">
          <h2 className="admin-main-title">Kárdex de movimientos</h2>
          <p className="admin-main-text">
            Revisa los movimientos de inventario por empresa y tipo de operación.
          </p>

          <LocalNavBar />

          <div className="admin-table-shell">
            <div className="admin-table-filters">
              <select
                className="input"
                value={selectedEmpresaId}
                onChange={(e) => {
                  setSelectedEmpresaId(e.target.value)
                  setPage(0)
                }}
              >
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={filtroTipo}
                onChange={(e) => {
                  setFiltroTipo(e.target.value)
                  setPage(0)
                }}
              >
                <option value="">Todos los tipos</option>
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
                <option value="TRASLADO">Traslado</option>
                <option value="AJUSTE">Ajuste</option>
              </select>
            </div>

            <div className="admin-table-view-toggle">
              <button
                type="button"
                className={viewMode === 'cards' ? 'active' : ''}
                onClick={() => setViewMode('cards')}
              >
                Vista cards
              </button>
              <button
                type="button"
                className={viewMode === 'table' ? 'active' : ''}
                onClick={() => setViewMode('table')}
              >
                Vista tabla
              </button>
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <table className={`admin-table ${viewMode === 'cards' ? 'admin-table--cards' : ''}`}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Producto (SKU)</th>
                  <th>Cant.</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Usuario</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center' }}>
                      Cargando...
                    </td>
                  </tr>
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center' }}>
                      No hay movimientos registrados
                    </td>
                  </tr>
                ) : (
                  movimientos.map((m) => (
                    <tr key={m.id}>
                      <td data-label="Fecha">{new Date(m.fecha).toLocaleString()}</td>
                      <td data-label="Tipo">
                        <span className={`badge ${m.tipo.toLowerCase()}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td data-label="Producto (SKU)">
                        <div>
                          <strong>{m.productoNombre}</strong>
                        </div>
                        <div
                          style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}
                        >
                          {m.productoSku}
                        </div>
                      </td>
                      <td data-label="Cant.">
                        <strong
                          style={{
                            color:
                              m.tipo === 'ENTRADA'
                                ? 'green'
                                : m.tipo === 'SALIDA'
                                  ? 'red'
                                  : 'inherit',
                          }}
                        >
                          {m.tipo === 'ENTRADA'
                            ? '+'
                            : m.tipo === 'SALIDA'
                              ? '-'
                              : ''}
                          {m.cantidadMovida}
                        </strong>
                      </td>
                      <td data-label="Origen">{m.repisaOrigenId ? `Repisa #${m.repisaOrigenId}` : '-'}</td>
                      <td data-label="Destino">{m.repisaDestinoId ? `Repisa #${m.repisaDestinoId}` : '-'}</td>
                      <td data-label="Usuario">{m.usuarioNombre}</td>
                      <td data-label="Observación">{m.observacion || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div
                className="pagination"
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  justifyContent: 'center',
                }}
              >
                <button
                  className="btn btn-secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Anterior
                </button>
                <span style={{ padding: '0.5rem' }}>
                  Página {page + 1} de {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default KardexPage
