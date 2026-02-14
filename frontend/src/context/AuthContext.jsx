import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { backendBaseUrl } from '../utils/config'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(localStorage.getItem('maingest-role') || '')
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [token, setToken] = useState(localStorage.getItem('maingest-token'))
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('maingest-token')
    localStorage.removeItem('maingest-role')
    localStorage.removeItem('maingest-user-id')
    localStorage.removeItem('maingest-user-name')
    localStorage.removeItem('maingest-user-email')
    localStorage.removeItem('maingest-user-photo')
    setToken(null)
    setUser(null)
    setRole('')
    setRoles([])
    setPermissions([])
  }, [])

  const fetchUser = useCallback(async (currentToken) => {
    if (!currentToken) {
      setUser(null)
      setRole('')
      setRoles([])
      setPermissions([])
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${backendBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser({
          id: data.id,
          nombre: data.nombre,
          correo: data.correo,
          foto: data.foto,
        })
        // Use backend response for role to ensure it's up to date
        setRole(data.role || '')
        setRoles(data.roles || [])
        setPermissions(data.permisos || [])
        
        // Update localStorage to keep it in sync (optional but good for initial render before fetch)
        if (data.role) localStorage.setItem('maingest-role', data.role)
        if (data.id) localStorage.setItem('maingest-user-id', String(data.id))
        if (data.nombre) localStorage.setItem('maingest-user-name', data.nombre)
        if (data.correo) localStorage.setItem('maingest-user-email', data.correo)
        if (data.foto) localStorage.setItem('maingest-user-photo', data.foto)
      } else {
        // Token invalid or expired
        logout()
      }
    } catch (error) {
      console.error('Error fetching user data', error)
      // Don't logout on network error, just keep local state if possible
    } finally {
      setIsLoading(false)
    }
  }, [logout])

  useEffect(() => {
    fetchUser(token)
  }, [token, fetchUser])

  const login = useCallback((newToken, newRole, userData) => {
    localStorage.setItem('maingest-token', newToken)
    // Initial optimistic update
    if (newRole) {
      localStorage.setItem('maingest-role', newRole)
      setRole(newRole)
    }
    if (userData) {
      setUser(userData)
      if (userData.id) localStorage.setItem('maingest-user-id', String(userData.id))
      if (userData.nombre) localStorage.setItem('maingest-user-name', userData.nombre)
      if (userData.correo) localStorage.setItem('maingest-user-email', userData.correo)
      if (userData.foto) localStorage.setItem('maingest-user-photo', userData.foto)
    }
    // Update token last to trigger the effect
    setToken(newToken)
  }, [])

  // Helper to check precise permission
  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission)
  }, [permissions])

  // Helper to check precise role name
  const hasRoleName = useCallback((roleName) => {
    return roles.includes(roleName)
  }, [roles])

  // Generic permission check helper
  const checkPermission = useCallback((area, actionCode, actionName) => {
    if (role === 'ADMIN') return true
    
    const areaUpper = area.toUpperCase()
    const areaLower = area.toLowerCase()
    
    // Check both formats: "AREA.CODE" and "area.name"
    // e.g., "USUARIO.1" or "usuario.ver"
    const codePerm = `${areaUpper}.${actionCode}`
    const namePerm = `${areaLower}.${actionName}`
    
    return permissions.includes(codePerm) || permissions.includes(namePerm)
  }, [role, permissions])

  // Granular permission helpers
  const canView = useCallback((area) => checkPermission(area, 1, 'ver'), [checkPermission])
  const canCreate = useCallback((area) => checkPermission(area, 2, 'crear'), [checkPermission])
  const canEdit = useCallback((area) => checkPermission(area, 3, 'editar'), [checkPermission])
  const canDelete = useCallback((area) => checkPermission(area, 4, 'eliminar'), [checkPermission])

  const value = useMemo(() => ({
    user,
    role, // UI Role (ADMIN, ADMIN_EMPRESA, USUARIO_EMPRESA)
    roles, // List of actual role names
    permissions, // List of specific permissions
    token,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRoleName,
    canView,
    canCreate,
    canEdit,
    canDelete,
    refreshUser: () => fetchUser(token) // Manual refresh if needed
  }), [
    user,
    role,
    roles,
    permissions,
    token,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRoleName,
    canView,
    canCreate,
    canEdit,
    canDelete,
    fetchUser
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
