export const isSafeInternalPath = (path) => {
  if (typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('://')) return false
  if (path.includes('\\')) return false
  return true
}

const allowedPathPatterns = [
  /^\/$/,
  /^\/login$/,
  /^\/home$/,
  /^\/crear-empresa$/,
  /^\/almacenes$/,
  /^\/almacen\/\d+$/,
  /^\/armario\/\d+$/,
  /^\/admin$/,
  /^\/usuarios-roles$/,
  /^\/empresa$/,
  /^\/suscripcion$/,
  /^\/pricing$/,
  /^\/catalogo$/,
  /^\/catalogo\/\d+$/,
  /^\/kardex$/,
]

export const isAllowedAppPath = (path) => {
  if (!isSafeInternalPath(path)) return false
  return allowedPathPatterns.some((pattern) => pattern.test(path))
}

export const safeNavigate = (navigate, path, options) => {
  if (!navigate) return
  if (!isAllowedAppPath(path)) {
    navigate('/home', { replace: true })
    return
  }
  navigate(path, options)
}
