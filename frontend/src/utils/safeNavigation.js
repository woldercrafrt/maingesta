export const isSafeInternalPath = (path) => {
  if (typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('://')) return false
  if (path.includes('\\')) return false
  return true
}

export const safeNavigate = (navigate, path, options) => {
  if (!navigate) return
  if (!isSafeInternalPath(path)) {
    navigate('/home', { replace: true })
    return
  }
  navigate(path, options)
}
