import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileNavMenu from '../components/MobileNavMenu'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
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
        <button className="btn btn-secondary" onClick={() => navigate('/home')}>Volver</button>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="top-header">
        <div className="header-left">
          <button className="btn btn-icon" onClick={() => navigate(-1)} title="Volver">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Kárdex de Movimientos</h1>
        </div>
        <div className="header-right">
          <MobileNavMenu />
          <ThemeSelector theme={theme} onThemeChange={onThemeChange} />
          <UserMenu />
        </div>
      </header>

      <main className="main-content">
        <div className="controls-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select 
            className="input" 
            value={selectedEmpresaId} 
            onChange={(e) => { setSelectedEmpresaId(e.target.value); setPage(0); }}
          >
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
          
          <select 
            className="input" 
            value={filtroTipo} 
            onChange={(e) => { setFiltroTipo(e.target.value); setPage(0); }}
          >
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SALIDA">Salida</option>
            <option value="TRASLADO">Traslado</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="table-container">
          <table className="table">
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
                <tr><td colSpan="8" style={{ textAlign: 'center' }}>Cargando...</td></tr>
              ) : movimientos.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center' }}>No hay movimientos registrados</td></tr>
              ) : (
                movimientos.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.fecha).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${m.tipo.toLowerCase()}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td>
                      <div><strong>{m.productoNombre}</strong></div>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{m.productoSku}</div>
                    </td>
                    <td>
                      <strong style={{ color: m.tipo === 'ENTRADA' ? 'green' : m.tipo === 'SALIDA' ? 'red' : 'inherit' }}>
                        {m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SALIDA' ? '-' : ''}{m.cantidadMovida}
                      </strong>
                    </td>
                    <td>{m.repisaOrigenId ? `Repisa #${m.repisaOrigenId}` : '-'}</td>
                    <td>{m.repisaDestinoId ? `Repisa #${m.repisaDestinoId}` : '-'}</td>
                    <td>{m.usuarioNombre}</td>
                    <td>{m.observacion || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            <button 
              className="btn btn-secondary" 
              disabled={page === 0} 
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <span style={{ padding: '0.5rem' }}>Página {page + 1} de {totalPages}</span>
            <button 
              className="btn btn-secondary" 
              disabled={page >= totalPages - 1} 
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              Siguiente
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default KardexPage
