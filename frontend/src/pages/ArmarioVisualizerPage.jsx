import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import { useAuth } from '../context/AuthContext'
import { backendBaseUrl } from '../utils/config'

const ArmarioVisualizerPage = ({ theme, onThemeChange }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canCreate, canEdit } = useAuth()
  const [armario, setArmario] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inventarioRows, setInventarioRows] = useState([])
  const [inventarioError, setInventarioError] = useState(null)
  const [selectedRepisaId, setSelectedRepisaId] = useState(null)
  const [repisaFilterId, setRepisaFilterId] = useState('')
  const [itemSearch, setItemSearch] = useState('')

  // Form states
  const [showAddRepisaModal, setShowAddRepisaModal] = useState(false)
  const [showEditSizeModal, setShowEditSizeModal] = useState(false)
  
  const [formRepisaCapacidad, setFormRepisaCapacidad] = useState('')
  
  const [formArmarioAncho, setFormArmarioAncho] = useState('')
  const [formArmarioAlto, setFormArmarioAlto] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      navigate('/login')
      return
    }

    setIsLoading(true)
    fetch(`${backendBaseUrl}/api/almacenes/armarios/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar el armario')
        }
        return response.json()
      })
      .then((data) => {
        setArmario(data)
        setError(null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [id, navigate])

  useEffect(() => {
    const token = localStorage.getItem('maingest-token')
    if (!token) return

    fetch(`${backendBaseUrl}/api/reportes/inventario`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar inventario')
        return res.json()
      })
      .then((rows) => {
        setInventarioRows(Array.isArray(rows) ? rows : [])
        setInventarioError(null)
      })
      .catch((err) => {
        setInventarioRows([])
        setInventarioError(err.message)
      })
  }, [id])

  const handleAddRepisa = (nextNivel) => {
    if (!nextNivel || !formRepisaCapacidad) return

    setIsSaving(true)
    const token = localStorage.getItem('maingest-token')
    
    fetch(`${backendBaseUrl}/api/almacenes/armarios/${id}/repisas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nivel: Number(nextNivel),
        capacidad: Number(formRepisaCapacidad),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al crear repisa')
        return res.json()
      })
      .then((newRepisa) => {
        setArmario((prev) => ({
          ...prev,
          repisas: [...(prev.repisas || []), newRepisa],
        }))
        setShowAddRepisaModal(false)
        setFormRepisaCapacidad('')
      })
      .catch((err) => alert(err.message))
      .finally(() => setIsSaving(false))
  }

  const handleEditSize = () => {
    if (!formArmarioAncho || !formArmarioAlto) return

    setIsSaving(true)
    const token = localStorage.getItem('maingest-token')

    fetch(`${backendBaseUrl}/api/almacenes/armarios/${id}/posicion`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ancho: Number(formArmarioAncho),
        alto: Number(formArmarioAlto),
        // Preserve other values if possible, but endpoint might need them?
        // Checking AlmacenController: it updates only if provided?
        // clampSizeOrNull(dto.ancho(), armario.getAncho()...)
        // Yes, if I send null/undefined for others, it keeps existing.
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al actualizar tamaño')
        return res.json()
      })
      .then((updatedArmario) => {
        setArmario((prev) => ({
          ...prev,
          ancho: updatedArmario.ancho,
          alto: updatedArmario.alto,
        }))
        setShowEditSizeModal(false)
      })
      .catch((err) => alert(err.message))
      .finally(() => setIsSaving(false))
  }

  if (isLoading) {
    return (
      <div className="page loading-container">
        <div className="loading-spinner" />
        <p>Cargando armario...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page error-container">
        <p className="error-message">{error}</p>
        <button className="theme-button" onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>
    )
  }

  if (!armario) {
    return null
  }

  const repisasSorted = [...(armario.repisas || [])].sort((a, b) => b.nivel - a.nivel)
  const gridRows = repisasSorted.length > 0 ? `repeat(${repisasSorted.length}, 1fr)` : '1fr'
  const maxNivel = (armario.repisas || []).reduce((max, r) => Math.max(max, Number(r?.nivel) || 0), 0)
  const nextNivel = maxNivel + 1

  const armarioId = Number(id)
  const inventarioDelArmario = (inventarioRows || []).filter((row) => Number(row?.armarioId) === armarioId)
  const repisaAgg = inventarioDelArmario.reduce((acc, row) => {
    const repisaId = row?.repisaId
    if (!repisaId) return acc
    const current = acc[repisaId] || {
      repisaId,
      repisaNivel: row?.repisaNivel,
      repisaCapacidad: row?.repisaCapacidad,
      itemsCount: 0,
      usedSpace: 0,
      items: [],
    }
    current.itemsCount += 1
    const tamanio = Number(row?.itemTamanio)
    current.usedSpace += Number.isFinite(tamanio) ? tamanio : 0
    current.items.push({
      id: row?.itemId,
      nombre: row?.itemNombre,
      estado: row?.itemEstado,
      tamanio: row?.itemTamanio,
      repisaId: row?.repisaId,
      repisaNivel: row?.repisaNivel,
    })
    acc[repisaId] = current
    return acc
  }, {})

  const getRepisaStats = (repisa) => {
    const repisaId = repisa?.id
    const cap = Number(repisa?.capacidad)
    const agg = repisaId ? repisaAgg[repisaId] : null
    const used = agg?.usedSpace || 0
    const count = agg?.itemsCount || 0
    const remaining = Number.isFinite(cap) ? Math.max(0, cap - used) : null
    return { count, used, remaining, items: agg?.items || [] }
  }

  const selectedRepisa = (armario.repisas || []).find((r) => r?.id === selectedRepisaId) || null
  const selectedStats = selectedRepisa ? getRepisaStats(selectedRepisa) : null

  const repisasForSelect = [...(armario.repisas || [])]
    .filter((r) => r?.id != null)
    .sort((a, b) => Number(b?.nivel) - Number(a?.nivel))

  const searchNormalized = String(itemSearch || '').trim().toLowerCase()
  const globalItems = inventarioDelArmario
    .filter((row) => row?.itemId)
    .map((row) => ({
      id: row?.itemId,
      nombre: row?.itemNombre,
      estado: row?.itemEstado,
      tamanio: row?.itemTamanio,
      repisaId: row?.repisaId,
      repisaNivel: row?.repisaNivel,
    }))

  const repisaFilterIdNumber = repisaFilterId ? Number(repisaFilterId) : null
  const filteredGlobalItems = globalItems.filter((it) => {
    if (repisaFilterIdNumber && Number(it?.repisaId) !== repisaFilterIdNumber) return false
    if (!searchNormalized) return true
    const nombre = String(it?.nombre || '').toLowerCase()
    const estado = String(it?.estado || '').toLowerCase()
    return nombre.includes(searchNormalized) || estado.includes(searchNormalized)
  })

  return (
    <main className="page armario-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-topbar-mark" />
          <span className="admin-topbar-title">Armario: {armario.nombre}</span>
        </div>
        <div className="admin-header-right">
          <Link to="/almacenes" className="theme-button">
            Volver a Almacenes
          </Link>
          <ThemeSelector theme={theme} onChange={onThemeChange} />
          <UserMenu />
        </div>
      </header>

      <div className="armario-body">
        <div className="armario-container">
          <div className="armario-container-header">
            <div className="armario-container-title">{armario.nombre}</div>
            <div className="armario-container-subtitle">{`Dimensiones: ${armario.ancho} x ${armario.alto}`}</div>
          </div>

          <div className="armario-scene">
            <div className="armario-prism">
              <div className="armario-top-face" />
              <div className="armario-left-face" />
              <div className="armario-box-visual">
                <div className="armario-right-face" />
                <div className="armario-right-inner-face" />
                <div className="armario-frame" style={{ gridTemplateRows: gridRows }}>
                  {repisasSorted.length > 0 ? (
                    repisasSorted.map((repisa) => (
                      <div
                        key={repisa.id ?? repisa.nivel}
                        className={`repisa-row ${selectedRepisaId === repisa?.id ? 'selected' : ''}`}
                        onClick={() => {
                          if (repisa?.id) setSelectedRepisaId(repisa.id)
                        }}
                        style={{
                          cursor: repisa?.id ? 'pointer' : undefined,
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            if (repisa?.id) setSelectedRepisaId(repisa.id)
                          }
                        }}
                      >
                        <div className="repisa-select-overlay" />
                        <div className="repisa-right-face" />
                        <div className="repisa-top-face" />
                        <div className="repisa-front" />
                        <div
                          style={{
                            position: 'absolute',
                            left: '10px',
                            top: '10px',
                            zIndex: 10,
                            padding: '6px 8px',
                            borderRadius: '10px',
                            border: selectedRepisaId === repisa?.id ? '1px solid rgba(37, 99, 235, 0.75)' : '1px solid rgba(0,0,0,0.12)',
                            background: 'rgba(0, 0, 0, 0.28)',
                            color: 'white',
                            fontSize: '12px',
                            lineHeight: 1.2,
                            backdropFilter: 'blur(2px)',
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{`Nivel ${repisa.nivel}`}</div>
                          <div style={{ opacity: 0.95 }}>{`${getRepisaStats(repisa).count} items`}</div>
                          <div style={{ opacity: 0.85 }}>{`Restante: ${getRepisaStats(repisa).remaining ?? '-'}`}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="armario-empty-state">
                      No hay repisas en este armario
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="armario-sidebar">
          <div className="armario-sidebar-header">
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Repisas</h3>
            <div className="armario-sidebar-actions">
              {canCreate('repisa') && (
                <button className="theme-button" onClick={() => setShowAddRepisaModal(true)}>
                  + Agregar Repisa
                </button>
              )}
              {canEdit('armario') && (
                <button
                  className="theme-button secondary"
                  onClick={() => {
                    setFormArmarioAncho(armario.ancho)
                    setFormArmarioAlto(armario.alto)
                    setShowEditSizeModal(true)
                  }}
                >
                  ✏️ Editar Tamaño
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            {inventarioError && <div className="error-message">{inventarioError}</div>}

            <div className="repisa-filters">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Buscar</label>
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Nombre o estado..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Repisa</label>
                <select
                  value={repisaFilterId}
                  onChange={(e) => {
                    const next = e.target.value
                    setRepisaFilterId(next)
                    if (next) setSelectedRepisaId(Number(next))
                  }}
                >
                  <option value="">Todas</option>
                  {repisasForSelect.map((r) => (
                    <option key={r.id} value={r.id}>{`Nivel ${r.nivel}`}</option>
                  ))}
                </select>
              </div>
            </div>

            {(searchNormalized || repisaFilterId) && (
              <div className="repisa-results">
                <div className="repisa-results-header">
                  <span>{`Resultados: ${filteredGlobalItems.length}`}</span>
                </div>
                <div className="repisa-results-list">
                  {filteredGlobalItems.length > 0 ? (
                    filteredGlobalItems.map((it) => (
                      <div
                        key={it.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (it?.repisaId) setSelectedRepisaId(Number(it.repisaId))
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            if (it?.repisaId) setSelectedRepisaId(Number(it.repisaId))
                          }
                        }}
                        className={`repisa-result-item ${selectedRepisaId && Number(it?.repisaId) === Number(selectedRepisaId) ? 'active' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px' }}>{it.nombre}</div>
                          <div className="repisa-result-badge">{`Nivel ${it.repisaNivel ?? '-'}`}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '2px' }}>
                          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{`Estado: ${it.estado ?? '-'}`}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{`Tamaño: ${it.tamanio ?? '-'}`}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '10px', color: 'var(--muted)' }}>No hay resultados.</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '12px', color: 'var(--muted)', fontSize: '0.9rem' }}>
              {selectedRepisa ? (
                `Seleccionada: nivel ${selectedRepisa.nivel} | Items: ${selectedStats?.count ?? 0} | Capacidad: ${selectedRepisa.capacidad ?? '-'} | Restante: ${selectedStats?.remaining ?? '-'}`
              ) : (
                'Selecciona una repisa haciendo click en el visual.'
              )}
            </div>

            {selectedRepisa && (
              <div style={{ overflow: 'auto', maxHeight: '52vh', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(148, 163, 184, 0.08)' }}>
                      <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--muted)' }}>Nombre</th>
                      <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--muted)' }}>Estado</th>
                      <th style={{ textAlign: 'right', padding: '10px', fontSize: '12px', color: 'var(--muted)' }}>Tamaño</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedStats?.items || []).length > 0 ? (
                      (selectedStats?.items || []).map((it) => (
                        <tr key={it.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px', color: 'var(--text)', fontSize: '13px' }}>{it.nombre}</td>
                          <td style={{ padding: '10px', color: 'var(--muted)', fontSize: '13px' }}>{it.estado ?? '-'}</td>
                          <td style={{ padding: '10px', color: 'var(--muted)', fontSize: '13px', textAlign: 'right' }}>{it.tamanio ?? '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ padding: '12px', color: 'var(--muted)' }}>
                          No hay items en esta repisa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Repisa Modal */}
      {showAddRepisaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Nueva Repisa</h3>
            <div className="form-group">
              <label>Nivel:</label>
              <div className="read-only-field">Se asignará el nivel {nextNivel}</div>
            </div>
            <div className="form-group">
              <label>Capacidad:</label>
              <input
                type="number"
                value={formRepisaCapacidad}
                onChange={(e) => setFormRepisaCapacidad(e.target.value)}
                placeholder="Ej. 50"
              />
            </div>
            <div className="modal-actions">
              <button
                className="theme-button secondary"
                onClick={() => setShowAddRepisaModal(false)}
              >
                Cancelar
              </button>
              <button
                className="theme-button"
                onClick={() => handleAddRepisa(nextNivel)}
                disabled={isSaving || !formRepisaCapacidad}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Size Modal */}
      {showEditSizeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Dimensiones</h3>
            <div className="form-group">
              <label>Ancho (0-1):</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={formArmarioAncho}
                onChange={(e) => setFormArmarioAncho(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Alto (0-1):</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={formArmarioAlto}
                onChange={(e) => setFormArmarioAlto(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="theme-button secondary"
                onClick={() => setShowEditSizeModal(false)}
              >
                Cancelar
              </button>
              <button
                className="theme-button"
                onClick={handleEditSize}
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .armario-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: var(--bg);
          color: var(--text);
        }
        .armario-body {
          display: flex;
          flex: 1;
          padding: 20px;
          gap: 20px;
          overflow: hidden;
        }
        .armario-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          background-color: var(--surface);
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 40px;
          gap: 18px;
          overflow: hidden;
        }
        .armario-container-header {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .armario-container-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: 0.2px;
        }
        .armario-container-subtitle {
          margin-top: 6px;
          font-size: 13px;
          color: var(--muted);
        }
        /* Fondo azul claro solo en tema claro */
        html:not([data-theme]) .armario-container,
        html[data-theme='light'] .armario-container {
          background: linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 50%, #e3f2fd 100%);
        }
        .armario-sidebar {
          width: 440px;
          background-color: var(--surface);
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        /* Fondo azul un poco más oscuro solo en tema claro */
        html:not([data-theme]) .armario-sidebar,
        html[data-theme='light'] .armario-sidebar {
          background: linear-gradient(135deg, #d6e8f0 0%, #e0f0f8 50%, #d1e8f5 100%);
        }
        .armario-sidebar h3 {
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }
        .armario-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border);
        }
        .armario-sidebar-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-shrink: 0;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 0.95rem;
        }
        .detail-item .label {
          color: var(--muted);
          font-weight: 500;
        }
        
        /* Visual Representation */
        .armario-scene {
          --armario-depth: 34px;
          --armario-top: 22px;
          --armario-bottom: 22px;
          --armario-border: 4px;
          padding-left: 0;
          padding-right: 54px; /* space for side numbers */
          background-color: var(--surface);
          border-radius: 12px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Fondo azul claro solo en tema claro */
        html:not([data-theme]) .armario-scene,
        html[data-theme='light'] .armario-scene {
          background: linear-gradient(145deg, #e8f4f8 0%, #f0f8ff 50%, #e3f2fd 100%);
        }
        .armario-prism {
          position: relative;
          width: calc(400px + var(--armario-depth));
          height: calc(600px + var(--armario-top));
        }
        .armario-top-face {
          position: absolute;
          left: 0;
          top: 0;
          width: calc(400px + var(--armario-depth));
          height: var(--armario-top);
          background-color: var(--surface);
          filter: brightness(1.12);
          clip-path: polygon(
            0 0,
            calc(100% - var(--armario-depth)) 0,
            100% 100%,
            var(--armario-depth) 100%
          );
          box-shadow: 0 2px 0 rgba(0,0,0,0.10);
          border-radius: 10px 10px 0 0;
          pointer-events: none;
        }
        .armario-left-face {
          position: absolute;
          left: 0;
          top: 0;
          width: var(--armario-depth);
          height: calc(600px + var(--armario-top));
          background-color: var(--surface);
          filter: brightness(0.86);
          clip-path: polygon(
            0 0,
            100% var(--armario-top),
            100% 100%,
            0 calc(100% - var(--armario-top))
          );
          box-shadow: 2px 0 0 rgba(0,0,0,0.10);
          border-radius: 10px 0 0 10px;
          pointer-events: none;
        }

        .armario-right-face {
          position: absolute;
          top: 0;
          right: 0;
          width: 18px;
          height: 100%;
          background-color: var(--surface);
          filter: brightness(0.84);
          border-left: 1px solid rgba(0,0,0,0.08);
          pointer-events: none;
          z-index: 1;
        }

        .armario-box-visual {
          position: absolute;
          left: var(--armario-depth);
          top: var(--armario-top);
          width: 400px;
          height: 600px;
          background-color: var(--surface);
          border: var(--armario-border) solid var(--border);
          display: flex;
          flex-direction: column;
          justify-content: flex-end; /* Stack from bottom if needed, but sorted list handles order */
          padding: 0;
          box-shadow:
            18px 20px 30px rgba(0,0,0,0.22),
            0 0 0 1px rgba(0,0,0,0.04) inset;
          border-radius: 10px;
          overflow: hidden;
        }

        .armario-right-inner-face {
          position: absolute;
          top: 0;
          right: 0;
          width: 18px;
          height: 100%;
          background: linear-gradient(to left, rgba(0,0,0,0.18), rgba(0,0,0,0));
          pointer-events: none;
          z-index: 1;
        }
        
        .armario-frame {
          display: grid;
          grid-template-columns: 1fr;
          height: 100%;
          background-color: var(--bg);
          padding: 0;
          margin: 0;
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
          z-index: 2;
        }

        .armario-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--muted);
          font-style: italic;
        }

        .repisa-row {
          position: relative;
          height: 100%;
          /* Reservar espacio para ambas caras (superior y frontal) en la base */
          padding-bottom: calc(var(--armario-top) + 10px);
        }
        .repisa-select-overlay {
          position: absolute;
          inset: 0;
          z-index: 8;
          border: 1px solid transparent;
          background: transparent;
          transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
          pointer-events: none;
        }
        .repisa-row:hover .repisa-select-overlay {
          background-color: rgba(37, 99, 235, 0.10);
          border-color: rgba(37, 99, 235, 0.45);
        }
        .repisa-row.selected .repisa-select-overlay {
          background-color: rgba(37, 99, 235, 0.16);
          border-color: rgba(37, 99, 235, 0.75);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.22) inset;
        }
        html[data-theme='dark'] .repisa-row:hover .repisa-select-overlay {
          background-color: rgba(96, 165, 250, 0.12);
          border-color: rgba(96, 165, 250, 0.55);
        }
        html[data-theme='dark'] .repisa-row.selected .repisa-select-overlay {
          background-color: rgba(96, 165, 250, 0.18);
          border-color: rgba(96, 165, 250, 0.85);
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.28) inset;
        }
        .repisa-front {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 10px;
          /* Cara frontal - la más clara */
          background-color: var(--surface);
          background-image: linear-gradient(to top, rgba(0,0,0,0.06), rgba(0,0,0,0.01));
          filter: brightness(1.12);
          border-top: 1px solid var(--border);
          box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 -1px 0 rgba(0,0,0,0.08);
          z-index: 6;
          pointer-events: none;
        }
        .repisa-top-face {
          position: absolute;
          left: 0;
          bottom: 10px; /* justo encima de la cara frontal */
          width: 100%;
          height: var(--armario-top);
          background-color: var(--surface);
          /* Cara superior - más oscura para contraste */
          filter: brightness(0.85);
          /* Plana a la izquierda y en bisel a 45° a la derecha */
          clip-path: polygon(
            0 0,
            calc(100% - var(--armario-top)) 0,
            100% 100%,
            0 100%
          );
          border-bottom: 1px solid var(--border);
          /* Sombras más marcadas para mejor contraste */
          box-shadow: 0 2px 0 rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08) inset;
          z-index: 7;
          pointer-events: none;
        }

        .repisa-right-face {
          position: absolute;
          top: 0;
          right: 0;
          /* Para 45°, usar el mismo grosor que la cara superior */
          width: var(--armario-top);
          height: 100%;
          background-color: var(--surface);
          /* Cara lateral - tono intermedio */
          filter: brightness(0.88);
          border-left: 1px solid rgba(0,0,0,0.12);
          /* Borde superior plano (90°) y borde inferior en 45° hacia la izquierda */
          clip-path: polygon(
            0 0,
            100% 0,
            100% calc(100% - 10px),
            0 calc(100% - 10px - var(--armario-top))
          );
          box-shadow: -2px 0 0 rgba(0,0,0,0.12) inset, 0 0 0 1px rgba(0,0,0,0.06) inset;
          z-index: 5;
          pointer-events: none;
        }

        /* Modal Styles (consistent with other pages) */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: var(--surface);
          padding: 24px;
          border-radius: 8px;
          width: 400px;
          max-width: 90%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: var(--text);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: var(--text);
          font-size: 0.9rem;
        }
        .form-group input {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background-color: var(--bg);
          color: var(--text);
          font-size: 1rem;
        }
        .form-group select {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background-color: var(--bg);
          color: var(--text);
          font-size: 1rem;
        }

        .repisa-filters {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 10px;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: rgba(148, 163, 184, 0.06);
          margin-bottom: 10px;
        }
        .repisa-filters .form-group label {
          font-size: 12px;
          margin-bottom: 6px;
          color: var(--muted);
        }
        .repisa-filters .form-group input,
        .repisa-filters .form-group select {
          padding: 8px 10px;
          font-size: 14px;
          border-radius: 10px;
          height: 36px;
        }

        .repisa-results {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 10px;
          background: rgba(148, 163, 184, 0.04);
        }
        .repisa-results-header {
          padding: 8px 10px;
          font-size: 12px;
          color: var(--muted);
          background: rgba(148, 163, 184, 0.08);
          border-bottom: 1px solid var(--border);
        }
        .repisa-results-list {
          max-height: 120px;
          overflow: auto;
        }
        .repisa-result-item {
          padding: 8px 10px;
          border-top: 1px solid var(--border);
          cursor: pointer;
          transition: background-color 140ms ease;
        }
        .repisa-result-item:hover {
          background: rgba(37, 99, 235, 0.08);
        }
        .repisa-result-item.active {
          background: rgba(37, 99, 235, 0.12);
        }
        html[data-theme='dark'] .repisa-result-item:hover {
          background: rgba(96, 165, 250, 0.10);
        }
        html[data-theme='dark'] .repisa-result-item.active {
          background: rgba(96, 165, 250, 0.14);
        }
        .repisa-result-badge {
          align-self: flex-start;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(148, 163, 184, 0.10);
          color: var(--muted);
          white-space: nowrap;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }

        .read-only-field {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background-color: var(--bg);
          color: var(--text);
          font-size: 1rem;
        }

      `}</style>
    </main>
  )
}

export default ArmarioVisualizerPage
