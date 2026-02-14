import React, { useRef, useState } from 'react'
import { createDefaultAlmacenShape } from '../utils/shapeUtils'

const AlmacenShapeEditor = ({ value, onChange }) => {
  const svgRef = useRef(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [addingCorner, setAddingCorner] = useState(false)
  const [deletingCorner, setDeletingCorner] = useState(false)
  const [hoverDeleteIndex, setHoverDeleteIndex] = useState(null)
  const [autoAlignEnabled, setAutoAlignEnabled] = useState(false)
  const [editorZoom, setEditorZoom] = useState(1)
  const points = value && value.length >= 3 ? value : createDefaultAlmacenShape()
  const viewBoxSize = 100
  const baseSizePx = 600

  const handleZoomIn = () => setEditorZoom((prev) => Math.min(3, prev + 0.1))
  const handleZoomOut = () => setEditorZoom((prev) => Math.max(0.5, prev - 0.1))
  const handleZoomReset = () => setEditorZoom(1)

  const snapAngleRad = Math.PI / 4
  const angleSnapThresholdRad = Math.PI / 24
  const snapDistance = 0.008

  const snapVectorAngle = (vx, vy) => {
    const length = Math.hypot(vx, vy)
    if (!length) {
      return { x: 0, y: 0, snapped: false }
    }
    const angle = Math.atan2(vy, vx)
    const snappedAngle = Math.round(angle / snapAngleRad) * snapAngleRad
    const diff = Math.abs(Math.atan2(Math.sin(angle - snappedAngle), Math.cos(angle - snappedAngle)))
    if (diff > angleSnapThresholdRad) {
      return { x: vx, y: vy, snapped: false }
    }
    return { x: Math.cos(snappedAngle) * length, y: Math.sin(snappedAngle) * length, snapped: true }
  }

  const snapValue = (value, candidates) => {
    let best = value
    let bestDistance = Number.POSITIVE_INFINITY
    for (const candidate of candidates) {
      const distance = Math.abs(candidate - value)
      if (distance < bestDistance) {
        bestDistance = distance
        best = candidate
      }
    }
    if (bestDistance <= snapDistance) {
      return best
    }
    return value
  }

  const getSnappedPoint = (rawPoint, previousPoint, nextPoint, otherPoints) => {
    let snapped = rawPoint
    const angleCandidates = []

    if (previousPoint) {
      const vx = rawPoint.x - previousPoint.x
      const vy = rawPoint.y - previousPoint.y
      const corrected = snapVectorAngle(vx, vy)
      if (corrected.snapped) {
        angleCandidates.push({
          x: previousPoint.x + corrected.x,
          y: previousPoint.y + corrected.y,
        })
      }
    }

    if (nextPoint) {
      const vx = nextPoint.x - rawPoint.x
      const vy = nextPoint.y - rawPoint.y
      const corrected = snapVectorAngle(vx, vy)
      if (corrected.snapped) {
        angleCandidates.push({
          x: nextPoint.x - corrected.x,
          y: nextPoint.y - corrected.y,
        })
      }
    }

    if (angleCandidates.length === 1) {
      snapped = angleCandidates[0]
    } else if (angleCandidates.length >= 2) {
      snapped = angleCandidates.reduce((best, candidate) => {
        const bestDist = Math.hypot(best.x - rawPoint.x, best.y - rawPoint.y)
        const candidateDist = Math.hypot(candidate.x - rawPoint.x, candidate.y - rawPoint.y)
        return candidateDist < bestDist ? candidate : best
      }, angleCandidates[0])
    }

    const xGuides = [0.5]
    const yGuides = [0.5]
    for (const point of otherPoints) {
      xGuides.push(point.x)
      yGuides.push(point.y)
    }

    snapped = {
      x: snapValue(snapped.x, xGuides),
      y: snapValue(snapped.y, yGuides),
    }

    return {
      x: Math.min(1, Math.max(0, snapped.x)),
      y: Math.min(1, Math.max(0, snapped.y)),
    }
  }

  const getNormalizedPoint = (event) => {
    const svg = svgRef.current
    if (!svg) {
      return null
    }
    if (typeof svg.createSVGPoint !== 'function') {
      const rect = svg.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return null
      }
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      return {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      }
    }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) {
      return null
    }
    const svgPoint = point.matrixTransform(ctm.inverse())
    const x = svgPoint.x / viewBoxSize
    const y = svgPoint.y / viewBoxSize
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    }
  }

  const handleMouseDown = (event, index) => {
    event.preventDefault()
    if (addingCorner || deletingCorner) {
      return
    }
    setDragIndex(index)
  }

  const handleMouseMove = (event) => {
    if (dragIndex === null) {
      return
    }
    const normalized = getNormalizedPoint(event)
    if (!normalized) {
      return
    }
    let nextPoint = { x: normalized.x, y: normalized.y }
    if (autoAlignEnabled) {
      const previousIndex = (dragIndex - 1 + points.length) % points.length
      const nextIndex = (dragIndex + 1) % points.length
      const previousPoint = points[previousIndex]
      const followingPoint = points[nextIndex]
      const otherPoints = points.filter((_, index) => index !== dragIndex)
      nextPoint = getSnappedPoint(nextPoint, previousPoint, followingPoint, otherPoints)
    }
    const nextPoints = points.map((point, index) =>
      index === dragIndex ? nextPoint : point,
    )
    onChange(nextPoints)
  }

  const handleMouseUp = () => {
    if (dragIndex !== null) {
      setDragIndex(null)
    }
  }

  const handleMouseLeave = () => {
    if (dragIndex !== null) {
      setDragIndex(null)
    }
  }

  const handleAddCorner = () => {
    if (!points || points.length < 2) {
      onChange(createDefaultAlmacenShape())
      return
    }
    setDeletingCorner(false)
    setHoverDeleteIndex(null)
    setAddingCorner(true)
  }

  const handleDeleteCorner = () => {
    if (!points || points.length === 0) {
      onChange(createDefaultAlmacenShape())
      setDeletingCorner(false)
      setHoverDeleteIndex(null)
      return
    }
    setAddingCorner(false)
    setDeletingCorner((prev) => {
      const next = !prev
      if (!next) {
        setHoverDeleteIndex(null)
      }
      return next
    })
  }

  const handleCanvasClick = (event) => {
    if (deletingCorner) {
      return
    }
    if (!addingCorner) {
      return
    }
    const normalized = getNormalizedPoint(event)
    if (!normalized) {
      return
    }
    const clampedX = normalized.x
    const clampedY = normalized.y
    if (!points || points.length < 2) {
      onChange([{ x: clampedX, y: clampedY }])
      setAddingCorner(false)
      return
    }
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY
    const px = clampedX
    const py = clampedY
    for (let i = 0; i < points.length; i += 1) {
      const j = (i + 1) % points.length
      const ax = points[i].x
      const ay = points[i].y
      const bx = points[j].x
      const by = points[j].y
      const vx = bx - ax
      const vy = by - ay
      const lengthSquared = vx * vx + vy * vy
      let t = 0
      if (lengthSquared > 0) {
        t = ((px - ax) * vx + (py - ay) * vy) / lengthSquared
        t = Math.max(0, Math.min(1, t))
      }
      const projX = ax + vx * t
      const projY = ay + vy * t
      const dx = px - projX
      const dy = py - projY
      const distSq = dx * dx + dy * dy
      if (distSq < bestDistance) {
        bestDistance = distSq
        bestIndex = j
      }
    }
    const previousPoint = points[(bestIndex - 1 + points.length) % points.length]
    const nextPoint = points[bestIndex]
    const rawPoint = { x: clampedX, y: clampedY }
    const newPoint = autoAlignEnabled
      ? getSnappedPoint(rawPoint, previousPoint, nextPoint, points)
      : rawPoint
    const nextPoints = [...points.slice(0, bestIndex), newPoint, ...points.slice(bestIndex)]
    onChange(nextPoints)
    setAddingCorner(false)
  }

  const handleDeletePoint = (event, index) => {
    if (!deletingCorner) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const nextPoints = points.filter((_, i) => i !== index)
    if (nextPoints.length < 3) {
      onChange(createDefaultAlmacenShape())
      setDeletingCorner(false)
      setHoverDeleteIndex(null)
      return
    }
    onChange(nextPoints)
  }

  const svgPointsAttr = points
    .map((point) => `${point.x * viewBoxSize},${point.y * viewBoxSize}`)
    .join(' ')

  return (
    <div className="almacen-shape-editor">
      <div className="almacen-shape-header">
        <span>Forma del almacén</span>
        <div className="editor-zoom-controls">
          <button type="button" className="theme-button icon-only" onClick={handleZoomOut} title="Alejar">-</button>
          <span className="zoom-label">{Math.round(editorZoom * 100)}%</span>
          <button type="button" className="theme-button icon-only" onClick={handleZoomIn} title="Acercar">+</button>
          <button type="button" className="theme-button text-only" onClick={handleZoomReset}>Reset</button>
        </div>
      </div>
      <div className="almacen-shape-scroll-wrapper">
        <div 
          className="almacen-shape-canvas-container"
          style={{ 
            width: `${baseSizePx * editorZoom}px`, 
            height: `${baseSizePx * editorZoom}px`,
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            className="almacen-shape-svg-element"
            preserveAspectRatio="none"
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <rect x="0" y="0" width={viewBoxSize} height={viewBoxSize} fill="#f3f4f6" />
            {points.length >= 3 && (
              <polygon
                points={svgPointsAttr}
                fill="#e0f2fe"
                stroke="#2563eb"
                strokeWidth={0.2 / editorZoom}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {points.map((point, index) => (
              <circle
                key={`${point.x}-${point.y}-${index}`}
                cx={point.x * viewBoxSize}
                cy={point.y * viewBoxSize}
                r={1.0 / editorZoom}
                fill={deletingCorner && hoverDeleteIndex === index ? '#dc2626' : '#1d4ed8'}
                stroke={deletingCorner && hoverDeleteIndex === index ? '#fecaca' : '#eff6ff'}
                strokeWidth={(deletingCorner && hoverDeleteIndex === index ? 0.2 : 0.1) / editorZoom}
                vectorEffect="non-scaling-stroke"
                onMouseDown={(event) => handleMouseDown(event, index)}
                onMouseEnter={() => {
                  if (deletingCorner) {
                    setHoverDeleteIndex(index)
                  }
                }}
                onMouseLeave={() => {
                  if (deletingCorner) {
                    setHoverDeleteIndex((prev) => (prev === index ? null : prev))
                  }
                }}
                onClick={(event) => handleDeletePoint(event, index)}
                style={deletingCorner ? { cursor: 'pointer' } : undefined}
              />
            ))}
          </svg>
        </div>
      </div>
      <div className="almacen-shape-actions">
        <button type="button" className="theme-button" onClick={handleAddCorner}>
          {addingCorner ? 'Haz click para ubicar la esquina' : 'Agregar esquina'}
        </button>
        <button type="button" className="theme-button" onClick={handleDeleteCorner}>
          {deletingCorner ? 'Cancelar eliminar' : 'Eliminar esquina'}
        </button>
        <button
          type="button"
          className={`theme-button ${autoAlignEnabled ? 'active' : ''}`}
          onClick={() => setAutoAlignEnabled((prev) => !prev)}
        >
          {autoAlignEnabled ? 'Auto alineación: activada' : 'Auto alineación: desactivada'}
        </button>
        <span className="almacen-shape-hint">
          {addingCorner
            ? 'Haz click dentro del canvas para agregar la esquina.'
            : deletingCorner
              ? 'Pasa el mouse por una esquina y haz click para eliminarla.'
              : autoAlignEnabled
                ? 'Auto alineación activa: ajusta a centro, ejes y ángulos 45°/90°.'
              : 'Arrastra las esquinas para ajustar la forma o agrega nuevas.'}
        </span>
      </div>
    </div>
  )
}

export default AlmacenShapeEditor
