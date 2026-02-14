export const createDefaultAlmacenShape = () => [
  { x: 0.4, y: 0.4 },
  { x: 0.6, y: 0.4 },
  { x: 0.6, y: 0.6 },
  { x: 0.4, y: 0.6 },
]

export const normalizeShape = (points) => {
  if (!points || points.length < 3) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  const width = maxX - minX
  const height = maxY - minY

  // Avoid extremely small shapes or division by zero
  if (width < 0.0001 || height < 0.0001) {
    return null
  }

  const normalizedPoints = points.map((p) => ({
    x: (p.x - minX) / width,
    y: (p.y - minY) / height,
  }))

  const aspectRatio = width / height
  return { points: normalizedPoints, aspectRatio }
}

export const denormalizeShape = (points, aspectRatio) => {
  if (!points) return createDefaultAlmacenShape()
  // If no aspect ratio, assume it fits in a square or is already legacy 0-1
  if (!aspectRatio) return points

  // Fit the shape into a central box within the 0-1 canvas (editor)
  // Target box: 80% of the canvas (0.1 to 0.9) to leave some margin
  const margin = 0.1
  const availableSize = 1 - margin * 2

  let w, h
  if (aspectRatio >= 1) {
    // Wider than tall
    w = availableSize
    h = availableSize / aspectRatio
  } else {
    // Taller than wide
    h = availableSize
    w = availableSize * aspectRatio
  }

  // Center the shape
  const offsetX = (1 - w) / 2
  const offsetY = (1 - h) / 2

  return points.map((p) => ({
    x: p.x * w + offsetX,
    y: p.y * h + offsetY,
  }))
}

export const sanitizeAlmacenShapePoints = (points) => {
  const clamp01 = (value) => Math.min(1, Math.max(0, value))
  const round4 = (value) => Math.round(value * 10000) / 10000

  if (!points || !Array.isArray(points)) {
    return createDefaultAlmacenShape()
  }

  const normalized = points
    .map((point) => {
      const x = point && Number.isFinite(point.x) ? round4(clamp01(point.x)) : null
      const y = point && Number.isFinite(point.y) ? round4(clamp01(point.y)) : null
      if (x == null || y == null) {
        return null
      }
      return { x, y }
    })
    .filter(Boolean)

  if (normalized.length < 3) {
    return createDefaultAlmacenShape()
  }

  const epsilon = 0.0005
  const deduped = []
  for (const point of normalized) {
    const last = deduped[deduped.length - 1]
    if (last && Math.abs(last.x - point.x) < epsilon && Math.abs(last.y - point.y) < epsilon) {
      continue
    }
    deduped.push(point)
  }

  const limited = deduped.slice(0, 200)
  return limited.length >= 3 ? limited : createDefaultAlmacenShape()
}

export const parseAlmacenShapePointsFromEstilos = (estilos) => {
  if (!estilos || typeof estilos !== 'string') {
    return createDefaultAlmacenShape()
  }
  const raw = estilos.trim()
  if (!raw) {
    return createDefaultAlmacenShape()
  }
  if (raw.startsWith('<svg')) {
    const match = raw.match(/points\s*=\s*"([^"]+)"/i)
    if (!match || !match[1]) {
      return createDefaultAlmacenShape()
    }
    const pairs = match[1].trim().split(/\s+/)
    const points = pairs
      .map((pair) => {
        const [xs, ys] = pair.split(',')
        const x = Number(xs)
        const y = Number(ys)
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null
        }
        if (x > 1 || y > 1) {
          return { x: x / 100, y: y / 100 }
        }
        return { x, y }
      })
      .filter(Boolean)
    return sanitizeAlmacenShapePoints(points)
  }
  try {
    const parsed = JSON.parse(raw)
    const points = parsed && Array.isArray(parsed.points) ? parsed.points : null
    const sanitized = sanitizeAlmacenShapePoints(points)
    if (parsed.aspectRatio) {
      return denormalizeShape(sanitized, parsed.aspectRatio)
    }
    return sanitized
  } catch {
    return createDefaultAlmacenShape()
  }
}

export const parseAlmacenShapeDataFromEstilos = (estilos) => {
  if (!estilos || typeof estilos !== 'string') {
    return null
  }
  const raw = estilos.trim()
  if (!raw) {
    return null
  }
  if (raw.startsWith('<svg')) {
    return { type: 'svg', svg: raw }
  }
  try {
    const parsed = JSON.parse(raw)
    const points = parsed && Array.isArray(parsed.points) ? parsed.points : null
    const cleaned = points
      ? points
          .map((point) => ({
            x: Number(point?.x),
            y: Number(point?.y),
          }))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      : null
    if (!cleaned || cleaned.length < 3) {
      return null
    }
    const aspectRatio = parsed?.aspectRatio ? Number(parsed.aspectRatio) : null
    return { type: 'points', points: cleaned, aspectRatio }
  } catch {
    return null
  }
}

export const getShapeBounds = (points) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }

  const width = maxX - minX
  const height = maxY - minY
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  return { minX, minY, maxX, maxY, width, height }
}

export const getAlmacenShapeAspectRatio = (estilos) => {
  const parsed = parseAlmacenShapeDataFromEstilos(estilos)
  if (!parsed || parsed.type === 'svg') {
    return null
  }
  if (parsed.aspectRatio && Number.isFinite(parsed.aspectRatio)) {
    return parsed.aspectRatio
  }
  const bounds = getShapeBounds(parsed.points)
  if (!bounds) {
    return null
  }
  return bounds.width / bounds.height
}

export const getAlmacenShapeRenderData = (estilos) => {
  const parsed = parseAlmacenShapeDataFromEstilos(estilos)
  if (!parsed) {
    return null
  }
  if (parsed.type === 'svg') {
    return { type: 'svg', svg: parsed.svg }
  }
  const bounds = getShapeBounds(parsed.points)
  if (!bounds) {
    return null
  }
  const ratioCandidate = parsed.aspectRatio && Number.isFinite(parsed.aspectRatio)
    ? parsed.aspectRatio
    : bounds.width / bounds.height
  if (!Number.isFinite(ratioCandidate) || ratioCandidate <= 0) {
    return null
  }
  const width = 100 * ratioCandidate
  const height = 100
  const points = parsed.points.map((point) => ({
    x: ((point.x - bounds.minX) / bounds.width) * width,
    y: ((point.y - bounds.minY) / bounds.height) * height,
  }))
  return { type: 'points', points, viewBox: `0 0 ${width} ${height}` }
}

export const renderAlmacenShape = (estilos) => {
  const data = getAlmacenShapeRenderData(estilos)
  if (!data) {
    return null
  }
  if (data.type === 'svg') {
    return (
      <div
        className="almacen-shape-svg-container"
        dangerouslySetInnerHTML={{ __html: data.svg }}
      />
    )
  }
  const pointsAttr = data.points.map((point) => `${point.x},${point.y}`).join(' ')
  return (
    <svg className="almacen-shape-svg" viewBox={data.viewBox} preserveAspectRatio="none">
      <polygon
        points={pointsAttr}
        fill="#e0f2fe"
        stroke="#1976d2"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
