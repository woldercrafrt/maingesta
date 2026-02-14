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
          <div className="armario-scene">
            <div className="armario-prism">
              <div className="armario-top-face" />
              <div className="armario-left-face" />
              <div className="armario-box-visual">
                <div className="armario-frame" style={{ gridTemplateRows: gridRows }}>
                  {repisasSorted.length > 0 ? (
                    repisasSorted.map((repisa) => (
                      <div key={repisa.id ?? repisa.nivel}>
                        {/* Espacio funcional para repisa sin elementos visuales */}
                      </div>
                    ))
                  ) : (
                    <div className="armario-empty-state">
                      No hay repisas en este armario
                    </div>
                  )}
                </div>
              </div>
              <div className="armario-floor" />
            </div>
          </div>
        </div>

        <div className="armario-sidebar">
          <h3>Detalles</h3>
          <div className="detail-item">
            <span className="label">Nombre:</span>
            <span className="value">{armario.nombre}</span>
          </div>
          <div className="detail-item">
            <span className="label">Tamaño Total:</span>
            <span className="value">{armario.tamanioTotal}</span>
          </div>
          <div className="detail-item">
            <span className="label">Dimensiones (m):</span>
            <span className="value">
              {armario.ancho} x {armario.alto}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Repisas:</span>
            <span className="value">{armario.repisas?.length || 0}</span>
          </div>

          <div className="sidebar-actions" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {canCreate('repisa') && (
              <button
                className="theme-button"
                onClick={() => setShowAddRepisaModal(true)}
              >
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
          justify-content: center;
          align-items: center;
          background-color: var(--surface);
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 40px;
        }
        .armario-sidebar {
          width: 300px;
          background-color: var(--surface);
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .armario-sidebar h3 {
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
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
          --armario-border: 4px;
          padding-left: 0;
          padding-right: 54px; /* space for side numbers */
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
          filter: brightness(1.08);
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
          padding: 10px;
          box-shadow:
            18px 20px 30px rgba(0,0,0,0.22),
            0 0 0 1px rgba(0,0,0,0.04) inset;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .armario-frame {
          display: grid;
          grid-template-columns: 1fr;
          height: 100%;
          background-color: var(--bg);
          padding: 10px 10px 14px;
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .armario-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--muted);
          font-style: italic;
        }


        
        .armario-floor {
          height: 20px;
          background-color: rgba(0,0,0,0.18);
          width: calc(400px + var(--armario-depth));
          position: absolute;
          bottom: -28px;
          left: 0;
          transform: none;
          opacity: 0.55;
          filter: blur(3px);
          border-radius: 999px;
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
