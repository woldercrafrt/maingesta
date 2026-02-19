import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import { backendBaseUrl } from '../utils/config'
import { renderAlmacenShape, getAlmacenShapeAspectRatio } from '../utils/shapeUtils'

const AlmacenVisualizerPage = ({ theme, onThemeChange }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [estructura, setEstructura] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inventarioRows, setInventarioRows] = useState([])
  const [inventarioError, setInventarioError] = useState(null)
  const [selectedRepisa, setSelectedRepisa] = useState(null)
  const [showRepisaItemsModal, setShowRepisaItemsModal] = useState(false)
  const [expandedArmarioId, setExpandedArmarioId] = useState(null)
  const canvasRef = useRef(null)
  const [draggingArmarioId, setDraggingArmarioId] = useState(null)
  const [hoveredArmarioId, setHoveredArmarioId] = useState(null)
  const [selectedArmarioIdForEdit, setSelectedArmarioIdForEdit] = useState(null)
  const dragArmarioRef = useRef(null)
  const [canvasStyle, setCanvasStyle] = useState({})
  const [canvasBaseSize, setCanvasBaseSize] = useState({ width: 0, height: 0 })
  const [almacenZoom, setAlmacenZoom] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const clampZoom = (value) => Math.min(3, Math.max(0.5, value))

  const ARMARIO_DISPLAY_ANCHO = 0.12
  const ARMARIO_DISPLAY_ALTO = 0.18

  const getArmarioLayout = (armario) => {
    const posX = typeof armario.posX === 'number' ? armario.posX : 0
    const posY = typeof armario.posY === 'number' ? armario.posY : 0
    const rotacion = typeof armario.rotacion === 'number' ? armario.rotacion : 0.0
    const rawDisplayAncho = typeof armario.displayAncho === 'number' ? armario.displayAncho : ARMARIO_DISPLAY_ANCHO
    const rawDisplayAlto = typeof armario.displayAlto === 'number' ? armario.displayAlto : ARMARIO_DISPLAY_ALTO
    const safeAncho = Math.max(0.01, clamp01(rawDisplayAncho))
    const safeAlto = Math.max(0.01, clamp01(rawDisplayAlto))
    return {
      posX: clamp01(Math.min(posX, 1 - safeAncho)),
      posY: clamp01(Math.min(posY, 1 - safeAlto)),
      ancho: safeAncho,
      alto: safeAlto,
      displayAncho: safeAncho,
      displayAlto: safeAlto,
      rotacion,
    }
  }

  const clamp01 = (value) => Math.min(1, Math.max(0, value))

  const actualizarArmarioLocal = (armarioId, patch) => {
    setEstructura((prev) => {
      if (!prev || !prev.armarios) return prev
      const armarios = prev.armarios.map((armario) => {
        if (armario.id !== armarioId) return armario
        return { ...armario, ...patch }
      })
      return { ...prev, armarios }
    })
  }

  const guardarPosicionArmario = (armarioId, posicion) => {
    const token = localStorage.getItem('maingest-token')
    if (!token) return Promise.resolve(null)
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    return fetch(`${backendBaseUrl}/api/almacenes/armarios/${armarioId}/posicion`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(posicion),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((updated) => {
        if (updated) actualizarArmarioLocal(updated.id, updated)
        return updated
      })
      .catch(() => null)
  }

  const onArmarioPointerDown = (event, armario) => {
    if (!isEditMode) return
    event.stopPropagation()
    event.preventDefault()
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    dragArmarioRef.current = {
      armarioId: armario.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialLayout: getArmarioLayout(armario),
      startLayout: getArmarioLayout(armario), // Alias for consistency
      rect,
      hasMoved: false,
      actionType: 'move'
    }
    setDraggingArmarioId(armario.id)
    event.target.setPointerCapture(event.pointerId)
  }

  const onHandlePointerDown = (event, armario, actionType) => {
    event.stopPropagation()
    event.preventDefault()
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const layout = getArmarioLayout(armario)

    dragArmarioRef.current = {
      armarioId: armario.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialLayout: layout,
      startLayout: layout,
      rect: rect,
      actionType: actionType,
      hasMoved: false
    }
    setDraggingArmarioId(armario.id)
    event.target.setPointerCapture(event.pointerId)
  }

  const onArmarioPointerMove = (event) => {
    const drag = dragArmarioRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    
    const dxPx = event.clientX - drag.startX
    const dyPx = event.clientY - drag.startY
    if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) {
        drag.hasMoved = true
    }

    if (drag.actionType === 'move') {
        const dxPct = dxPx / drag.rect.width
        const dyPct = dyPx / drag.rect.height
        let newX = drag.initialLayout.posX + dxPct
        let newY = drag.initialLayout.posY + dyPct
        newX = clamp01(newX)
        newY = clamp01(newY)
        if (newX + drag.initialLayout.ancho > 1) newX = 1 - drag.initialLayout.ancho
        if (newY + drag.initialLayout.alto > 1) newY = 1 - drag.initialLayout.alto
        actualizarArmarioLocal(drag.armarioId, { posX: newX, posY: newY })
    } else if (drag.actionType === 'rotate') {
         const cx = drag.rect.left + (drag.startLayout.posX + drag.startLayout.ancho/2) * drag.rect.width
         const cy = drag.rect.top + (drag.startLayout.posY + drag.startLayout.alto/2) * drag.rect.height
         const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI)
         const deg = angle + 90
         actualizarArmarioLocal(drag.armarioId, { rotacion: deg })
    } else if (drag.actionType && drag.actionType.startsWith('resize-')) {
        const MIN_SIZE = 0.01
        const dxPct = dxPx / drag.rect.width
        const dyPct = dyPx / drag.rect.height
        const start = drag.startLayout
        let nextPosX = start.posX
        let nextPosY = start.posY
        let nextAncho = start.ancho
        let nextAlto = start.alto

        if (drag.actionType === 'resize-se') {
            nextAncho = clamp01(start.ancho + dxPct)
            nextAlto = clamp01(start.alto + dyPct)
        } else if (drag.actionType === 'resize-sw') {
            nextPosX = clamp01(start.posX + dxPct)
            nextAncho = clamp01(start.ancho - dxPct)
            nextAlto = clamp01(start.alto + dyPct)
        } else if (drag.actionType === 'resize-ne') {
            nextPosY = clamp01(start.posY + dyPct)
            nextAncho = clamp01(start.ancho + dxPct)
            nextAlto = clamp01(start.alto - dyPct)
        } else if (drag.actionType === 'resize-nw') {
            nextPosX = clamp01(start.posX + dxPct)
            nextPosY = clamp01(start.posY + dyPct)
            nextAncho = clamp01(start.ancho - dxPct)
            nextAlto = clamp01(start.alto - dyPct)
        }

        nextAncho = Math.max(MIN_SIZE, nextAncho)
        nextAlto = Math.max(MIN_SIZE, nextAlto)

        if (nextPosX + nextAncho > 1) {
            nextAncho = 1 - nextPosX
        }
        if (nextPosY + nextAlto > 1) {
            nextAlto = 1 - nextPosY
        }

        actualizarArmarioLocal(drag.armarioId, {
            posX: nextPosX,
            posY: nextPosY,
            displayAncho: nextAncho,
            displayAlto: nextAlto,
        })
    }
  }

  const onArmarioPointerUp = (event) => {
    const drag = dragArmarioRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragArmarioRef.current = null
    setDraggingArmarioId(null)
    if (!drag.hasMoved) {
        setSelectedArmarioIdForEdit(drag.armarioId)
        return
    }
    const armario = estructura?.armarios?.find((a) => a.id === drag.armarioId)
    if (armario) {
      guardarPosicionArmario(drag.armarioId, {
        posX: armario.posX,
        posY: armario.posY,
        displayAncho: armario.displayAncho,
        displayAlto: armario.displayAlto,
        rotacion: armario.rotacion,
      })
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('maingest-token')
    if (!token) return
    Promise.resolve().then(() => {
      setIsLoading(true)
    })
    fetch(`${backendBaseUrl}/api/almacenes/${id}/estructura`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el almacén o no tienes permisos.')
        return res.json()
      })
      .then((json) => {
        setEstructura(json)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    const token = localStorage.getItem('maingest-token')
    if (!token) return

    fetch(`${backendBaseUrl}/api/reportes/inventario`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el inventario')
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

  useEffect(() => {
    if (!canvasRef.current || !estructura) {
      return
    }
    const ratio = getAlmacenShapeAspectRatio(estructura.estilos)

    const applySize = () => {
      const parent = canvasRef.current?.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(parent)
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0

      const pW = rect.width - paddingLeft - paddingRight
      const pH = rect.height - paddingTop - paddingBottom

      if (pW <= 0 || pH <= 0) return

      let w = pW
      let h = pH

      if (ratio) {
        h = w / ratio
        if (h > pH) {
          h = pH
          w = h * ratio
        }
      }

      const widthPx = Math.floor(w)
      const heightPx = Math.floor(h)
      const next = {
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        flex: 'none',
      }

      setCanvasBaseSize((prev) => {
        if (prev.width === widthPx && prev.height === heightPx) {
          return prev
        }
        return { width: widthPx, height: heightPx }
      })

      setCanvasStyle((prev) => {
        if (prev.width === next.width && prev.height === next.height && prev.flex === next.flex) {
          return prev
        }
        return next
      })
    }

    let frame = requestAnimationFrame(applySize)
    const handleResize = () => {
      frame = requestAnimationFrame(applySize)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frame)
    }
  }, [estructura])

  const token = localStorage.getItem('maingest-token')
  if (!token) return <Navigate to="/" />

  const almacenId = Number(id)
  const inventarioDelAlmacen = (inventarioRows || []).filter((row) => Number(row?.almacenId) === almacenId)
  const repisaAgg = inventarioDelAlmacen.reduce((acc, row) => {
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
    return { count, used, remaining }
  }

  const openRepisaItems = (armario, repisa) => {
    const repisaId = repisa?.id
    const agg = repisaId ? repisaAgg[repisaId] : null
    const stats = getRepisaStats(repisa)
    setSelectedRepisa({
      repisaId,
      repisaNivel: repisa?.nivel,
      repisaCapacidad: repisa?.capacidad,
      armarioId: armario?.id,
      armarioNombre: armario?.nombre,
      items: agg?.items || [],
      stats,
    })
    setShowRepisaItemsModal(true)
  }

  const zoomedCanvasStyle =
    canvasBaseSize.width && canvasBaseSize.height
      ? {
          ...canvasStyle,
          width: `${Math.floor(canvasBaseSize.width * almacenZoom)}px`,
          height: `${Math.floor(canvasBaseSize.height * almacenZoom)}px`,
        }
      : canvasStyle

  return (
    <main className="page admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-topbar-mark" />
          <span className="admin-topbar-title">Visualizando: {estructura?.nombre || 'Almacén'}</span>
        </div>
        <div className="admin-topbar-actions">
           <ThemeSelector theme={theme} onChange={onThemeChange} />
           <button className="theme-button" onClick={() => navigate('/admin')}>Volver al Panel</button>
        </div>
      </header>
      <div className="admin-body admin-body-single">
        <div className="admin-main" style={{ width: '100%', padding: '20px' }}>
          {isLoading && <div>Cargando...</div>}
          {error && <div className="error-message">{error}</div>}
          {!isLoading && !error && estructura && (
            <div className="almacen-visualizacion">
               <div className="almacen-shape-container">
                    <div className="almacen-zoom-controls">
                      <button
                        type="button"
                        className="theme-button"
                        onClick={() => setAlmacenZoom((prev) => clampZoom(prev - 0.1))}
                      >
                        -
                      </button>
                      <input
                        className="almacen-zoom-slider"
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={almacenZoom}
                        onChange={(event) => setAlmacenZoom(clampZoom(Number(event.target.value)))}
                      />
                      <button
                        type="button"
                        className="theme-button"
                        onClick={() => setAlmacenZoom((prev) => clampZoom(prev + 0.1))}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="theme-button"
                        onClick={() => setAlmacenZoom(1)}
                      >
                        {`${Math.round(almacenZoom * 100)}%`}
                      </button>
                      <button
                        type="button"
                        className="theme-button"
                        style={{
                            marginLeft: '10px',
                            backgroundColor: isEditMode ? '#2563eb' : '#f3f4f6',
                            color: isEditMode ? 'white' : '#374151',
                            border: '1px solid #d1d5db'
                        }}
                        onClick={() => {
                            setIsEditMode(!isEditMode)
                            if (isEditMode) setSelectedArmarioIdForEdit(null)
                        }}
                        title={isEditMode ? 'Desactivar edición' : 'Habilitar edición'}
                      >
                        {isEditMode ? '✏️ Editando' : '👁️ Visualizar'}
                      </button>
                    </div>
                    <style>{`
                        .resize-handle {
                          position: absolute;
                          width: 12px;
                          height: 12px;
                          background: white;
                          border: 2px solid #2563eb;
                          border-radius: 50%;
                          z-index: 20;
                          pointer-events: auto;
                        }
                        .resize-handle.nw { top: -6px; left: -6px; cursor: nw-resize; }
                        .resize-handle.ne { top: -6px; right: -6px; cursor: ne-resize; }
                        .resize-handle.sw { bottom: -6px; left: -6px; cursor: sw-resize; }
                        .resize-handle.se { bottom: -6px; right: -6px; cursor: se-resize; }
                        .rotate-handle {
                          position: absolute;
                          top: -25px;
                          left: 50%;
                          transform: translateX(-50%);
                          width: 12px;
                          height: 12px;
                          background: #2563eb;
                          border: 2px solid white;
                          border-radius: 50%;
                          cursor: grab;
                          z-index: 20;
                          pointer-events: auto;
                          box-shadow: 0 0 4px rgba(0,0,0,0.2);
                        }
                        .rotate-connector {
                            position: absolute;
                            top: -15px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 2px;
                            height: 15px;
                            background: #2563eb;
                            z-index: 19;
                        }
                    `}</style>
                    <div className="almacen-zoom-scroll">
                      <div
                        className="almacen-canvas"
                        ref={canvasRef}
                        style={zoomedCanvasStyle}
                        onClick={() => setSelectedArmarioIdForEdit(null)}
                      >
                        <div className="almacen-shape-layer">
                          {renderAlmacenShape(estructura.estilos) || (
                            <div className="almacen-shape-placeholder">
                              <p>Forma no disponible</p>
                            </div>
                          )}
                        </div>
                        <div className="almacen-armarios-layer">
                          {estructura.armarios &&
                            estructura.armarios.map((armario) => {
                              const layout = getArmarioLayout(armario)
                              return (
                                <div
                                  key={armario.id}
                                  className={`armario-box ${draggingArmarioId === armario.id ? 'dragging' : ''} ${hoveredArmarioId === armario.id ? 'hovered' : ''}`}
                                  style={{
                                    left: `${layout.posX * 100}%`,
                                    top: `${layout.posY * 100}%`,
                                    width: `${layout.ancho * 100}%`,
                                    height: `${layout.alto * 100}%`,
                                    transform: `rotate(${layout.rotacion}deg)`,
                                    border: (isEditMode && selectedArmarioIdForEdit === armario.id) ? '2px solid #2563eb' : undefined,
                                    zIndex: (isEditMode && selectedArmarioIdForEdit === armario.id) ? 10 : 1,
                                    cursor: isEditMode ? 'move' : 'default'
                                  }}
                                  onPointerDown={(e) => onArmarioPointerDown(e, armario)}
                                  onPointerMove={onArmarioPointerMove}
                                  onPointerUp={onArmarioPointerUp}
                                  onPointerCancel={onArmarioPointerUp}
                                  onMouseEnter={() => setHoveredArmarioId(armario.id)}
                                  onMouseLeave={() => setHoveredArmarioId(null)}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!isEditMode) navigate(`/armario/${armario.id}`)
                                  }}
                                >
                                  <span className="armario-box-label" style={{ transform: `rotate(-${layout.rotacion}deg)` }}>{armario.nombre}</span>
                                  {isEditMode && selectedArmarioIdForEdit === armario.id && (
                                     <>
                                         <div className="resize-handle nw" onPointerDown={(e) => onHandlePointerDown(e, armario, 'resize-nw')} />
                                         <div className="resize-handle ne" onPointerDown={(e) => onHandlePointerDown(e, armario, 'resize-ne')} />
                                         <div className="resize-handle sw" onPointerDown={(e) => onHandlePointerDown(e, armario, 'resize-sw')} />
                                         <div className="resize-handle se" onPointerDown={(e) => onHandlePointerDown(e, armario, 'resize-se')} />
                                         <div className="rotate-connector" />
                                         <div className="rotate-handle" onPointerDown={(e) => onHandlePointerDown(e, armario, 'rotate')} />
                                     </>
                                   )}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="almacen-armarios-list">
                    <h3 className="almacen-list-title">Armarios y repisas</h3>
                    {inventarioError && (
                      <div className="error-message" style={{ marginBottom: '10px' }}>
                        {inventarioError}
                      </div>
                    )}
                    {estructura.armarios && estructura.armarios.length > 0 ? (
                      <div className="armarios-list-container">
                        {estructura.armarios.map((armario) => (
                          <div key={armario.id}>
                            <div
                              className={`armario-list-item ${hoveredArmarioId === armario.id ? 'hovered' : ''}`}
                              onMouseEnter={() => setHoveredArmarioId(armario.id)}
                              onMouseLeave={() => setHoveredArmarioId(null)}
                              onClick={() =>
                                setExpandedArmarioId((prev) => (prev === armario.id ? null : armario.id))
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setExpandedArmarioId((prev) => (prev === armario.id ? null : armario.id))
                                }
                              }}
                            >
                              <div className="armario-header">
                                <span
                                  className={`armario-caret ${expandedArmarioId === armario.id ? 'expanded' : ''}`}
                                  aria-hidden="true"
                                >
                                  ▸
                                </span>
                                <span className="armario-icon">📦</span>
                                <span className="armario-name">{armario.nombre}</span>
                              </div>
                              <div className="armario-list-right">
                                {armario.repisas && armario.repisas.length > 0 && (
                                  <div className="repisas-count">{armario.repisas.length} repisas</div>
                                )}
                                <button
                                  type="button"
                                  className="armario-open-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/armario/${armario.id}`)
                                  }}
                                  title="Abrir armario"
                                >
                                  Abrir
                                </button>
                              </div>
                            </div>

                            <div
                              className={`armario-accordion ${expandedArmarioId === armario.id ? 'expanded' : ''}`}
                              style={{
                                maxHeight:
                                  expandedArmarioId === armario.id && armario.repisas
                                    ? `${Math.min(360, armario.repisas.length * 74 + 16)}px`
                                    : '0px',
                              }}
                            >
                              {expandedArmarioId === armario.id && armario.repisas && armario.repisas.length > 0 ? (
                                <div className="armario-accordion-inner">
                                  {[...armario.repisas]
                                    .sort((a, b) => Number(b?.nivel) - Number(a?.nivel))
                                    .map((repisa) => {
                                      const stats = getRepisaStats(repisa)
                                      return (
                                        <div
                                          key={repisa.id ?? repisa.nivel}
                                          className="repisa-list-item"
                                          onClick={() => openRepisaItems(armario, repisa)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault()
                                              openRepisaItems(armario, repisa)
                                            }
                                          }}
                                        >
                                          <div className="repisa-list-main">
                                            <div className="repisa-list-title">{`Repisa nivel ${repisa.nivel}`}</div>
                                            <div className="repisa-list-meta">{`${stats.count} items`}</div>
                                          </div>
                                          <div className="repisa-list-stats">
                                            <div>{`Cap: ${repisa.capacidad ?? '-'}`}</div>
                                            <div>{`Rest: ${stats.remaining ?? '-'}`}</div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-armarios-container">
                        <p className="no-armarios">No hay armarios en este almacén</p>
                      </div>
                    )}
                  </div>
            </div>
          )}
        </div>
      </div>

      {showRepisaItemsModal && selectedRepisa && (
        <div className="modal-overlay" onClick={() => setShowRepisaItemsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{`Items en ${selectedRepisa.armarioNombre || 'Armario'} - Repisa nivel ${selectedRepisa.repisaNivel ?? '-'}`}</h3>
            <div style={{ marginBottom: '14px', color: 'var(--muted)', fontSize: '0.9rem' }}>
              {`Items: ${selectedRepisa.stats?.count ?? 0} | Capacidad: ${selectedRepisa.repisaCapacidad ?? '-'} | Espacio restante: ${selectedRepisa.stats?.remaining ?? '-'}`}
            </div>

            {selectedRepisa.items && selectedRepisa.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflow: 'auto' }}>
                {selectedRepisa.items.map((it) => (
                  <div key={it.id} style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{it.nombre}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{`Estado: ${it.estado ?? '-'}`}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{`Tamaño: ${it.tamanio ?? '-'}`}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--muted)' }}>Esta repisa no tiene items.</div>
            )}

            <div className="modal-actions">
              <button className="theme-button secondary" onClick={() => setShowRepisaItemsModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default AlmacenVisualizerPage
