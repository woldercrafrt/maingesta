import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import LocalNavBar from '../components/LocalNavBar'
import { backendBaseUrl } from '../utils/config'

const AdminPage = ({ theme, onThemeChange, mode = 'admin' }) => {
  const [activeSection, setActiveSection] = useState(
    mode === 'users-roles' ? 'usuarios' : 'resumen',
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileNavRef = useRef(null)
  const [rolesData, setRolesData] = useState(null)
  const [empresasData, setEmpresasData] = useState(null)
  const [usuariosData, setUsuariosData] = useState(null)
  const [permisosCatalogo, setPermisosCatalogo] = useState(null)
  const [rolePermisos, setRolePermisos] = useState([])
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [roleFormNombre, setRoleFormNombre] = useState('')
  const [roleFormDescripcion, setRoleFormDescripcion] = useState('')
  const [roleFormEmpresaId, setRoleFormEmpresaId] = useState('')
  const [showRoleFormModal, setShowRoleFormModal] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false)
  const [showDeleteRoleReassignModal, setShowDeleteRoleReassignModal] = useState(false)
  const [deleteRoleNuevoRolId, setDeleteRoleNuevoRolId] = useState('')
  const [deleteRoleDejarSinRol, setDeleteRoleDejarSinRol] = useState(false)
  const [isDeletingRole, setIsDeletingRole] = useState(false)
  const [showRolePermissionsModal, setShowRolePermissionsModal] = useState(false)
  const [roleForPermisos, setRoleForPermisos] = useState(null)
  const [isLoadingRolePermisos, setIsLoadingRolePermisos] = useState(false)
  const [permisoFilterText, setPermisoFilterText] = useState('')
  const [updatingPermisoIds, setUpdatingPermisoIds] = useState([])
  const [isSavingEmpresa, setIsSavingEmpresa] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState(null)
  const [empresaFormNombre, setEmpresaFormNombre] = useState('')
  const [showEmpresaFormModal, setShowEmpresaFormModal] = useState(false)
  const [empresaToDelete, setEmpresaToDelete] = useState(null)
  const [showDeleteEmpresaModal, setShowDeleteEmpresaModal] = useState(false)
  const [usuarioFilterText, setUsuarioFilterText] = useState('')
  const [usuarioFilterEmpresa, setUsuarioFilterEmpresa] = useState('')
  const [usuarioFilterRol, setUsuarioFilterRol] = useState('')
  const [showUsuarioEmpresaModal, setShowUsuarioEmpresaModal] = useState(false)
  const [usuarioForEmpresa, setUsuarioForEmpresa] = useState(null)
  const [usuarioEmpresasDetalle, setUsuarioEmpresasDetalle] = useState(null)
  const [empresaAsignarId, setEmpresaAsignarId] = useState('')
  const [rolAsignarId, setRolAsignarId] = useState('')
  const [isSavingUsuarioEmpresa, setIsSavingUsuarioEmpresa] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showUsuarioFormModal, setShowUsuarioFormModal] = useState(false)
  const [isSavingUsuario, setIsSavingUsuario] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState(null)
  const [usuarioFormCorreo, setUsuarioFormCorreo] = useState('')
  const [usuarioFormNombre, setUsuarioFormNombre] = useState('')
  const [usuarioFormClave, setUsuarioFormClave] = useState('')
  const [usuarioFormEstado, setUsuarioFormEstado] = useState('ACTIVO')
  const [usuarioEmpresaDirty, setUsuarioEmpresaDirty] = useState(false)
  const [planesData, setPlanesData] = useState(null)
  const [showPlanFormModal, setShowPlanFormModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planFormNombre, setPlanFormNombre] = useState('')
  const [planFormDescripcion, setPlanFormDescripcion] = useState('')
  const [planFormLimAlmacenes, setPlanFormLimAlmacenes] = useState('')
  const [planFormLimArmarios, setPlanFormLimArmarios] = useState('')
  const [planFormLimRepisas, setPlanFormLimRepisas] = useState('')
  const [planFormLimItems, setPlanFormLimItems] = useState('')
  const [planFormLimUsuarios, setPlanFormLimUsuarios] = useState('')
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [showAsignarSuscripcionModal, setShowAsignarSuscripcionModal] = useState(false)
  const [empresaParaSuscripcion, setEmpresaParaSuscripcion] = useState(null)
  const [suscripcionPlanId, setSuscripcionPlanId] = useState('')
  const [suscripcionFechaInicio, setSuscripcionFechaInicio] = useState('')
  const [suscripcionFechaFin, setSuscripcionFechaFin] = useState('')
  const [isSavingSuscripcion, setIsSavingSuscripcion] = useState(false)
  const [empresaSuscripciones, setEmpresaSuscripciones] = useState({})
  const [showBloqueoModal, setShowBloqueoModal] = useState(false)
  const [empresaParaBloqueo, setEmpresaParaBloqueo] = useState(null)
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')
  const [auditoriaData, setAuditoriaData] = useState(null)
  const [isLoadingAuditoria, setIsLoadingAuditoria] = useState(false)
  const [auditoriaFilterUsuario, setAuditoriaFilterUsuario] = useState('')
  const [auditoriaFilterObjeto, setAuditoriaFilterObjeto] = useState('')
  const [auditoriaFilterAccion, setAuditoriaFilterAccion] = useState('')
  const [auditoriaFilterTexto, setAuditoriaFilterTexto] = useState('')
  const [tableViewMode, setTableViewMode] = useState('cards')
  const role = localStorage.getItem('maingest-role') || 'ADMIN'

  const sectionsAdmin = [
    { id: 'resumen', label: 'Resumen general' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'roles-globales', label: 'Roles' },
    { id: 'empresas', label: 'Empresas' },
    { id: 'planes', label: 'Planes de suscripción' },
    { id: 'auditoria', label: 'Historial' },
  ]

  const sectionsAdminUsuariosRoles = [
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'roles-globales', label: 'Roles' },
    { id: 'auditoria', label: 'Historial' },
  ]

  const sectionsAdminEmpresa = [
    { id: 'resumen-empresa', label: 'Resumen de empresa' },
    { id: 'usuarios-empresa', label: 'Usuarios de empresa' },
    { id: 'almacenes-empresa', label: 'Almacenes' },
  ]

  const sectionsAlmacen = [
    { id: 'panel-almacen', label: 'Panel de almacén' },
    { id: 'inventario', label: 'Inventario' },
    { id: 'movimientos', label: 'Movimientos' },
  ]

  let sections
  if (mode === 'users-roles' && (role === 'ADMIN' || role === 'ADMIN_EMPRESA')) {
    sections = sectionsAdminUsuariosRoles
  } else if (role === 'ADMIN') {
    sections = sectionsAdmin
  } else if (role === 'ADMIN_EMPRESA') {
    sections = sectionsAdminEmpresa
  } else {
    sections = sectionsAlmacen
  }

  const roleLabel =
    role === 'ADMIN' ? 'Super administrador' : role === 'ADMIN_EMPRESA' ? 'Admin de empresa' : 'Admin de almacén'

  useEffect(() => {
    const isUsersRolesMode = mode === 'users-roles'
    const canFetch =
      (role === 'ADMIN' &&
        (activeSection === 'roles-globales' ||
          activeSection === 'empresas' ||
          activeSection === 'usuarios' ||
          activeSection === 'planes')) ||
      (isUsersRolesMode &&
        role === 'ADMIN_EMPRESA' &&
        (activeSection === 'roles-globales' || activeSection === 'usuarios'))
    if (!canFetch) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    if (activeSection === 'roles-globales' && rolesData === null) {
      fetch(`${backendBaseUrl}/api/roles`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar roles')
          }
          return response.json()
        })
        .then((json) => {
          setRolesData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    if (activeSection === 'empresas' && empresasData === null) {
      fetch(`${backendBaseUrl}/api/empresas`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar empresas')
          }
          return response.json()
        })
        .then((json) => {
          setEmpresasData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    if (activeSection === 'usuarios' && usuariosData === null) {
      fetch(`${backendBaseUrl}/api/usuarios`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar usuarios')
          }
          return response.json()
        })
        .then((json) => {
          setUsuariosData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    if (activeSection === 'planes' && planesData === null) {
      fetch(`${backendBaseUrl}/api/planes-suscripcion`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar planes')
          }
          return response.json()
        })
        .then((json) => {
          setPlanesData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar los planes.')
        })
    }
    if (activeSection === 'empresas' && empresasData && planesData === null) {
      fetch(`${backendBaseUrl}/api/planes-suscripcion`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar planes')
          }
          return response.json()
        })
        .then((json) => {
          setPlanesData(json || [])
        })
        .catch(() => {})
    }
  }, [activeSection, role, mode, empresasData, rolesData, usuariosData, planesData])

  useEffect(() => {
    if (!(role === 'ADMIN' && activeSection === 'auditoria')) {
      return
    }
    if (auditoriaData !== null || isLoadingAuditoria) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    Promise.resolve().then(() => {
      setIsLoadingAuditoria(true)
    })
    fetch(`${backendBaseUrl}/api/auditoria`, {
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar historial')
        }
        return response.json()
      })
      .then((json) => {
        setAuditoriaData(json || [])
        setError(null)
      })
      .catch(() => {
        setError('No se pudo cargar el historial de acciones.')
      })
      .finally(() => {
        setIsLoadingAuditoria(false)
      })
  }, [activeSection, role, auditoriaData, isLoadingAuditoria])

  useEffect(() => {
    if (!mobileNavOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target)) {
        setMobileNavOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [mobileNavOpen])

  const resetRoleForm = () => {
    setEditingRole(null)
    setRoleFormNombre('')
    setRoleFormDescripcion('')
    setRoleFormEmpresaId('')
  }

  const closeRoleFormModal = () => {
    resetRoleForm()
    setShowRoleFormModal(false)
  }

  const openCreateRole = () => {
    resetRoleForm()
    const token = localStorage.getItem('maingest-token')
    if (token && !empresasData) {
      const headers = {
        Authorization: `Bearer ${token}`,
      }
      fetch(`${backendBaseUrl}/api/empresas`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar empresas')
          }
          return response.json()
        })
        .then((json) => {
          setEmpresasData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    setShowRoleFormModal(true)
  }

  const openEditRole = (rol) => {
    setEditingRole(rol)
    setRoleFormNombre(rol.nombre || '')
    setRoleFormDescripcion(rol.descripcion || '')
    setRoleFormEmpresaId(
      typeof rol.empresaId === 'number' && Number.isFinite(rol.empresaId)
        ? String(rol.empresaId)
        : '',
    )
    const token = localStorage.getItem('maingest-token')
    if (token && !empresasData) {
      const headers = {
        Authorization: `Bearer ${token}`,
      }
      fetch(`${backendBaseUrl}/api/empresas`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar empresas')
          }
          return response.json()
        })
        .then((json) => {
          setEmpresasData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    setShowRoleFormModal(true)
  }

  const openRolePermissions = (rol) => {
    if (!rol || !rol.id) {
      return
    }
    setRoleForPermisos(rol)
    setShowRolePermissionsModal(true)
    setPermisoFilterText('')
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    if (!permisosCatalogo) {
      fetch(`${backendBaseUrl}/api/permisos`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar permisos')
          }
          return response.json()
        })
        .then((json) => {
          setPermisosCatalogo(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información de permisos.')
        })
    }
    setIsLoadingRolePermisos(true)
    fetch(`${backendBaseUrl}/api/roles/${rol.id}/permisos`, {
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar permisos del rol')
        }
        return response.json()
      })
      .then((json) => {
        setRolePermisos(json || [])
        setError(null)
      })
      .catch(() => {
        setError('No se pudieron cargar los permisos del rol.')
      })
      .finally(() => {
        setIsLoadingRolePermisos(false)
      })
  }

  const closeRolePermissionsModal = () => {
    setShowRolePermissionsModal(false)
    setRoleForPermisos(null)
    setRolePermisos([])
    setPermisoFilterText('')
  }

  const handleSubmitRole = (event) => {
    event.preventDefault()
    if (!roleFormNombre.trim()) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    setIsSavingRole(true)
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const empresaIdValue =
      roleFormEmpresaId && roleFormEmpresaId.trim()
        ? Number(roleFormEmpresaId)
        : null
    const cuerpo = JSON.stringify({
      nombre: roleFormNombre.trim(),
      descripcion: roleFormDescripcion.trim() || '',
      empresaId: empresaIdValue,
    })
    const url =
      editingRole && editingRole.id
        ? `${backendBaseUrl}/api/roles/${editingRole.id}`
        : `${backendBaseUrl}/api/roles`
    const method = editingRole && editingRole.id ? 'PUT' : 'POST'
    fetch(url, {
      method,
      headers,
      body: cuerpo,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al guardar rol')
        }
        return response.json()
      })
      .then((guardado) => {
        const esNuevo = !(editingRole && editingRole.id)
        setRolesData((anteriores) => {
          if (!anteriores) {
            return [guardado]
          }
          if (editingRole && editingRole.id) {
            return anteriores.map((rol) => (rol.id === guardado.id ? guardado : rol))
          }
          return [...anteriores, guardado]
        })
        closeRoleFormModal()
        if (esNuevo) {
          openRolePermissions(guardado)
        }
        setError(null)
      })
      .catch(() => {
        setError('No se pudo guardar el rol.')
      })
      .finally(() => {
        setIsSavingRole(false)
      })
  }

  const toggleRolePermiso = (permiso) => {
    if (!roleForPermisos || !roleForPermisos.id || !permiso || !permiso.id) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    if (updatingPermisoIds.includes(permiso.id)) {
      return
    }
    const asignado = rolePermisos.some((item) => item.id === permiso.id)
    setUpdatingPermisoIds((anteriores) => [...anteriores, permiso.id])
    if (!asignado) {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
      fetch(`${backendBaseUrl}/api/roles/${roleForPermisos.id}/permisos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ permisoId: permiso.id }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al asignar permiso')
          }
          setRolePermisos((anteriores) => {
            if (anteriores.some((item) => item.id === permiso.id)) {
              return anteriores
            }
            return [...anteriores, permiso]
          })
          setError(null)
        })
        .catch(() => {
          setError('No se pudo asignar el permiso.')
        })
        .finally(() => {
          setUpdatingPermisoIds((anteriores) =>
            anteriores.filter((id) => id !== permiso.id),
          )
        })
    } else {
      fetch(
        `${backendBaseUrl}/api/roles/${roleForPermisos.id}/permisos/${permiso.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
        .then((response) => {
          if (!response.ok && response.status !== 404) {
            throw new Error('Error al quitar permiso')
          }
          setRolePermisos((anteriores) =>
            anteriores.filter((item) => item.id !== permiso.id),
          )
          setError(null)
        })
        .catch(() => {
          setError('No se pudo quitar el permiso.')
        })
        .finally(() => {
          setUpdatingPermisoIds((anteriores) =>
            anteriores.filter((id) => id !== permiso.id),
          )
        })
    }
  }

  const openDeleteRole = (rol) => {
    setRoleToDelete(rol)
    setDeleteRoleNuevoRolId('')
    setDeleteRoleDejarSinRol(false)
    setShowDeleteRoleModal(true)
  }

  const handleDeleteRole = () => {
    const objetivo = roleToDelete
    if (!objetivo || !objetivo.id) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    setIsDeletingRole(true)
    fetch(`${backendBaseUrl}/api/roles/${objetivo.id}`, {
      method: 'DELETE',
      headers,
    })
      .then((response) => {
        if (response.status === 409) {
          throw new Error('ROL_EN_USO')
        }
        if (!response.ok && response.status !== 404) {
          throw new Error('Error al eliminar rol')
        }
        setRolesData((anteriores) => {
          if (!anteriores) {
            return anteriores
          }
          return anteriores.filter((item) => item.id !== objetivo.id)
        })
        if (editingRole && editingRole.id === objetivo.id) {
          resetRoleForm()
        }
        setRoleToDelete(null)
        setShowDeleteRoleModal(false)
        setError(null)
      })
      .catch((err) => {
        if (err && err.message === 'ROL_EN_USO') {
          setShowDeleteRoleModal(false)
          setShowDeleteRoleReassignModal(true)
          return
        }
        setError('No se pudo eliminar el rol.')
      })
      .finally(() => {
        setIsDeletingRole(false)
      })
  }

  const closeDeleteRoleReassignModal = () => {
    setShowDeleteRoleReassignModal(false)
    setDeleteRoleNuevoRolId('')
    setDeleteRoleDejarSinRol(false)
  }

  const handleDeleteRoleWithReassign = () => {
    const objetivo = roleToDelete
    if (!objetivo || !objetivo.id) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    if (!deleteRoleDejarSinRol && !deleteRoleNuevoRolId) {
      setError('Debes elegir un rol de reemplazo o marcar dejar sin rol.')
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    setIsDeletingRole(true)
    fetch(`${backendBaseUrl}/api/roles/${objetivo.id}/eliminar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nuevoRolId: deleteRoleDejarSinRol ? null : Number(deleteRoleNuevoRolId),
        dejarSinRol: deleteRoleDejarSinRol,
      }),
    })
      .then((response) => {
        if (!response.ok && response.status !== 404) {
          throw new Error('Error al eliminar rol')
        }
        setRolesData((anteriores) => {
          if (!anteriores) {
            return anteriores
          }
          return anteriores.filter((item) => item.id !== objetivo.id)
        })
        if (editingRole && editingRole.id === objetivo.id) {
          resetRoleForm()
        }
        setRoleToDelete(null)
        closeDeleteRoleReassignModal()
        setError(null)
      })
      .catch(() => {
        setError('No se pudo eliminar el rol.')
      })
      .finally(() => {
        setIsDeletingRole(false)
      })
  }

  const resetEmpresaForm = () => {
    setEditingEmpresa(null)
    setEmpresaFormNombre('')
  }

  const closeEmpresaFormModal = () => {
    resetEmpresaForm()
    setShowEmpresaFormModal(false)
  }

  const openCreateEmpresa = () => {
    resetEmpresaForm()
    setShowEmpresaFormModal(true)
  }

  const openEditEmpresa = (empresa) => {
    setEditingEmpresa(empresa)
    setEmpresaFormNombre(empresa.nombre || '')
    setShowEmpresaFormModal(true)
  }

  const handleSubmitEmpresa = (event) => {
    event.preventDefault()
    if (!empresaFormNombre.trim()) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    setIsSavingEmpresa(true)
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const cuerpo = JSON.stringify({
      nombre: empresaFormNombre.trim(),
    })
    const url =
      editingEmpresa && editingEmpresa.id
        ? `${backendBaseUrl}/api/empresas/${editingEmpresa.id}`
        : `${backendBaseUrl}/api/empresas`
    const method = editingEmpresa && editingEmpresa.id ? 'PUT' : 'POST'
    fetch(url, {
      method,
      headers,
      body: cuerpo,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al guardar empresa')
        }
        return response.json()
      })
      .then((guardada) => {
        setEmpresasData((anteriores) => {
          if (!anteriores) {
            return [guardada]
          }
          if (editingEmpresa && editingEmpresa.id) {
            return anteriores.map((empresa) =>
              empresa.id === guardada.id ? guardada : empresa,
            )
          }
          return [...anteriores, guardada]
        })
        closeEmpresaFormModal()
        setError(null)
      })
      .catch(() => {
        setError('No se pudo guardar la empresa.')
      })
      .finally(() => {
        setIsSavingEmpresa(false)
      })
  }

  const openDeleteEmpresa = (empresa) => {
    setEmpresaToDelete(empresa)
    setShowDeleteEmpresaModal(true)
  }

  const handleDeleteEmpresa = () => {
    const objetivo = empresaToDelete
    if (!objetivo || !objetivo.id) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    fetch(`${backendBaseUrl}/api/empresas/${objetivo.id}`, {
      method: 'DELETE',
      headers,
    })
      .then((response) => {
        if (!response.ok && response.status !== 404) {
          throw new Error('Error al eliminar empresa')
        }
        setEmpresasData((anteriores) => {
          if (!anteriores) {
            return anteriores
          }
          return anteriores.filter((item) => item.id !== objetivo.id)
        })
        setEmpresaToDelete(null)
        setShowDeleteEmpresaModal(false)
        setError(null)
      })
      .catch(() => {
        setError('No se pudo eliminar la empresa.')
      })
  }

  const resetUsuarioForm = () => {
    setEditingUsuario(null)
    setUsuarioFormCorreo('')
    setUsuarioFormNombre('')
    setUsuarioFormClave('')
    setUsuarioFormEstado('ACTIVO')
    setUsuarioEmpresaDirty(false)
  }

  const closeUsuarioFormModal = () => {
    resetUsuarioForm()
    setShowUsuarioFormModal(false)
  }

  const openCreateUsuario = () => {
    resetUsuarioForm()
    setShowUsuarioFormModal(true)
  }

  const openEditUsuario = (usuario) => {
    if (!usuario) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (token && !rolesData) {
      const headers = {
        Authorization: `Bearer ${token}`,
      }
      if (!empresasData) {
        fetch(`${backendBaseUrl}/api/empresas`, {
          headers,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error('Error al cargar empresas')
            }
            return response.json()
          })
          .then((json) => {
            setEmpresasData(json || [])
            setError(null)
          })
          .catch(() => {
            setError('No se pudo cargar la información.')
          })
      }
      fetch(`${backendBaseUrl}/api/roles`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar roles')
          }
          return response.json()
        })
        .then((json) => {
          setRolesData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    setEditingUsuario(usuario)
    setUsuarioForEmpresa(usuario)
    setUsuarioFormCorreo(usuario.correo || '')
    setUsuarioFormNombre(usuario.nombre || '')
    setUsuarioFormClave('')
    setUsuarioFormEstado(usuario.estado || 'ACTIVO')
    setShowUsuarioFormModal(true)

    setEmpresaAsignarId('')
    setRolAsignarId('')
    setUsuarioEmpresaDirty(false)
    const tokenEmpresas = localStorage.getItem('maingest-token')
    if (tokenEmpresas && usuario && usuario.id) {
      fetch(`${backendBaseUrl}/api/usuarios/${usuario.id}/empresas`, {
        headers: {
          Authorization: `Bearer ${tokenEmpresas}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar empresas del usuario')
          }
          return response.json()
        })
        .then((json) => {
          const lista = json || []
          setUsuarioEmpresasDetalle(lista)
          const item = lista && Array.isArray(lista) && lista.length > 0 ? lista[0] : null
          const empresaId = item && item.empresaId != null ? String(item.empresaId) : ''
          const rolId = item && item.rolId != null ? String(item.rolId) : ''
          setEmpresaAsignarId(empresaId)
          setRolAsignarId(rolId)
          setUsuarioEmpresaDirty(false)
          setError(null)
        })
        .catch(() => {
          setUsuarioEmpresasDetalle([])
        })
    } else {
      setUsuarioEmpresasDetalle([])
    }
  }

  const handleSubmitUsuario = (event) => {
    event.preventDefault()
    const isEdit = !!(editingUsuario && editingUsuario.id)
    if (!isEdit) {
      if (
        !usuarioFormCorreo.trim() ||
        !usuarioFormNombre.trim() ||
        !usuarioFormClave.trim() ||
        !usuarioFormEstado.trim()
      ) {
        return
      }
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    setIsSavingUsuario(true)
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    let payload
    if (isEdit) {
      payload = {}
      if (usuarioFormCorreo.trim()) {
        payload.correo = usuarioFormCorreo.trim()
      }
      if (usuarioFormClave.trim()) {
        payload.clave = usuarioFormClave
      }
      if (usuarioFormNombre.trim()) {
        payload.nombre = usuarioFormNombre.trim()
      }
      if (usuarioFormEstado.trim()) {
        payload.estado = usuarioFormEstado.trim()
      }
    } else {
      payload = {
        correo: usuarioFormCorreo.trim(),
        clave: usuarioFormClave,
        nombre: usuarioFormNombre.trim(),
        estado: usuarioFormEstado.trim(),
      }
    }

    const url =
      editingUsuario && editingUsuario.id
        ? `${backendBaseUrl}/api/usuarios/${editingUsuario.id}`
        : `${backendBaseUrl}/api/usuarios`
    const method = isEdit ? 'PUT' : 'POST'

    const recargarEmpresasUsuario = (usuarioId) =>
      fetch(`${backendBaseUrl}/api/usuarios/${usuarioId}/empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((response) => {
        if (!response.ok) {
          throw new Error('ERROR_RECARGA_EMPRESAS')
        }
        return response.json()
      })

    const aplicarListaEmpresas = (usuarioId, lista) => {
      const safeLista = lista || []
      setUsuarioEmpresasDetalle(safeLista)
      setUsuariosData((anteriores) => {
        if (!anteriores) {
          return anteriores
        }
        const item = safeLista.length > 0 ? safeLista[0] : null
        const empresaId = item && item.empresaId != null ? item.empresaId : null
        const encontrada =
          empresaId != null && empresasData && Array.isArray(empresasData)
            ? empresasData.find((empresa) => empresa.id === empresaId)
            : null
        const empresaNombre =
          empresaId == null
            ? null
            : encontrada
            ? encontrada.nombre
            : String(empresaId)
        const rolNombre = item && item.rolNombre ? item.rolNombre : null
        return anteriores.map((usuario) => {
          if (usuario.id !== usuarioId) {
            return usuario
          }
          return {
            ...usuario,
            empresas: empresaNombre ? [empresaNombre] : [],
            empresasDetalle:
              empresaNombre && rolNombre ? [`${empresaNombre} (${rolNombre})`] : [],
            empresaNombre: empresaNombre || null,
            empresaRolNombre: rolNombre || null,
          }
        })
      })
    }

    const quitarEmpresaActualSiExiste = (usuarioId) =>
      recargarEmpresasUsuario(usuarioId).then((lista) => {
        const empresaActualId =
          lista && Array.isArray(lista) && lista.length > 0 ? lista[0].empresaId : null
        if (empresaActualId == null) {
          return null
        }
        return fetch(`${backendBaseUrl}/api/usuarios/${usuarioId}/empresas/${empresaActualId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then((response) => {
          if (response.status === 409) {
            throw new Error('CONFLICTO_QUITAR_EMPRESA')
          }
          if (!response.ok && response.status !== 404) {
            throw new Error('ERROR_QUITAR_EMPRESA')
          }
          return null
        })
      })

    fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al guardar usuario')
        }
        return response.json()
      })
      .then((guardado) => {
        const usuarioId = guardado && guardado.id ? guardado.id : editingUsuario?.id
        if (!usuarioId) {
          return guardado
        }
        const aplicarCambiosExtra = () => {
          if (!isEdit || !usuarioEmpresaDirty) {
            return Promise.resolve()
          }

          // ámbito Global: empresaAsignarId vacío => rol global (rolAsignarId puede ser vacío)
          if (!empresaAsignarId) {
            return quitarEmpresaActualSiExiste(usuarioId)
              .then(() =>
                fetch(`${backendBaseUrl}/api/usuarios/${usuarioId}/roles`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    rolId: rolAsignarId ? Number(rolAsignarId) : null,
                  }),
                }),
              )
              .then((response) => {
                if (response.status === 409) {
                  throw new Error('CONFLICTO_ROL')
                }
                if (!response.ok) {
                  throw new Error('ERROR_ASIGNAR_ROL')
                }
                return null
              })
          }

          // ámbito Empresa
          return fetch(`${backendBaseUrl}/api/usuarios/${usuarioId}/empresas`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              empresaId: Number(empresaAsignarId),
              rolId: rolAsignarId ? Number(rolAsignarId) : null,
            }),
          }).then((response) => {
            if (response.status === 409) {
              throw new Error('CONFLICTO_EMPRESA')
            }
            if (!response.ok) {
              throw new Error('ERROR_ASIGNAR_EMPRESA')
            }
            return null
          })
        }

        return aplicarCambiosExtra()
          .then(() => recargarEmpresasUsuario(usuarioId))
          .then((lista) => {
            aplicarListaEmpresas(usuarioId, lista)
            return guardado
          })
      })
      .then((guardadoFinal) => {
        setUsuariosData((anteriores) => {
          if (!anteriores) {
            return [guardadoFinal]
          }
          if (editingUsuario && editingUsuario.id) {
            return anteriores.map((usuario) =>
              usuario.id === guardadoFinal.id ? guardadoFinal : usuario,
            )
          }
          return [...anteriores, guardadoFinal]
        })
        closeUsuarioFormModal()
        setError(null)
      })
      .catch((err) => {
        if (err && err.message === 'CONFLICTO_ROL') {
          setError('El usuario ya tiene ese rol global.')
          return
        }
        if (err && err.message === 'CONFLICTO_EMPRESA') {
          setError('No se pudo asignar la empresa (conflicto).')
          return
        }
        if (err && err.message === 'CONFLICTO_QUITAR_EMPRESA') {
          setError('No se pudo quitar la empresa del usuario (conflicto).')
          return
        }
        setError('No se pudo guardar el usuario.')
      })
      .finally(() => {
        setIsSavingUsuario(false)
      })
  }

  const _openUsuarioEmpresaModal = (usuario) => {
    console.log('openUsuarioEmpresaModal llamado con usuario:', usuario)
    if (!usuario || !usuario.id) {
      console.log('Usuario inválido o sin ID')
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      console.log('Sin token')
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    setUsuarioForEmpresa(usuario)
    setShowUsuarioEmpresaModal(true)
    setEmpresaAsignarId('')
    setRolAsignarId('')
    setUsuarioEmpresasDetalle(null)
    console.log('Modal abierto, usuarioForEmpresa:', usuario)
    if (!empresasData) {
      fetch(`${backendBaseUrl}/api/empresas`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar empresas')
          }
          return response.json()
        })
        .then((json) => {
          setEmpresasData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    if (!rolesData) {
      fetch(`${backendBaseUrl}/api/roles`, {
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al cargar roles')
          }
          return response.json()
        })
        .then((json) => {
          setRolesData(json || [])
          setError(null)
        })
        .catch(() => {
          setError('No se pudo cargar la información.')
        })
    }
    fetch(`${backendBaseUrl}/api/usuarios/${usuario.id}/empresas`, {
      headers,
    })
      .then((response) => {
        console.log('Respuesta de empresas del usuario:', response.status)
        if (!response.ok) {
          throw new Error('Error al cargar empresas de usuario')
        }
        return response.json()
      })
      .then((json) => {
        console.log('Empresas del usuario cargadas:', json)
        setUsuarioEmpresasDetalle(json || [])
        setError(null)
      })
      .catch((err) => {
        console.error('Error al cargar empresas del usuario:', err)
        setError('No se pudo cargar la información.')
      })
  }

  const asignarGlobalSinRol = () => {
    console.log('Iniciando asignarGlobalSinRol')
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      console.log('Sin token')
      return
    }
    setIsSavingUsuarioEmpresa(true)
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    // Primero, quitar cualquier empresa asignada
    fetch(`${backendBaseUrl}/api/usuarios/${usuarioForEmpresa.id}/empresas`, {
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('ERROR_CARGAR_EMPRESAS')
        }
        return response.json()
      })
      .then((empresas) => {
        console.log('Empresas actuales del usuario:', empresas)
        if (empresas && Array.isArray(empresas) && empresas.length > 0) {
          // Quitar la primera empresa (asumimos que solo tiene una)
          const empresaId = empresas[0].empresaId
          return fetch(`${backendBaseUrl}/api/usuarios/${usuarioForEmpresa.id}/empresas/${empresaId}`, {
            method: 'DELETE',
            headers,
          })
        }
        return Promise.resolve()
      })
      .then(() => {
        // Asignar rol nulo global
        return fetch(`${backendBaseUrl}/api/usuarios/${usuarioForEmpresa.id}/roles`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            rolId: null,
          }),
        })
      })
      .then((response) => {
        if (response.status === 409) {
          throw new Error('CONFLICTO_ROL')
        }
        if (!response.ok) {
          throw new Error('ERROR_ASIGNAR_ROL')
        }
        console.log('Rol nulo asignado exitosamente')
        return response
      })
      .then(() => {
        // Actualizar el estado local
        setUsuariosData((anteriores) => {
          if (!anteriores) {
            return anteriores
          }
          return anteriores.map((usuario) => {
            if (usuario.id !== usuarioForEmpresa.id) {
              return usuario
            }
            return {
              ...usuario,
              roles: [],
              empresas: [],
              empresasDetalle: [],
              empresaNombre: null,
              empresaRolNombre: null,
            }
          })
        })
        setUsuarioEmpresasDetalle([])
        setSuccess('Cambio exitoso: usuario asignado a Global sin rol')
        setError(null)
        if (showUsuarioEmpresaModal) {
          closeUsuarioEmpresaModal()
        }
      })
      .catch((err) => {
        console.error('Error en asignarGlobalSinRol:', err)
        if (err && err.message === 'CONFLICTO_ROL') {
          setError('Conflicto al asignar el rol.')
        } else {
          setError('No se pudo asignar el rol.')
        }
      })
      .finally(() => {
        setIsSavingUsuarioEmpresa(false)
        setTimeout(() => setSuccess(null), 3000)
      })
  }

  const closeUsuarioEmpresaModal = () => {
    setShowUsuarioEmpresaModal(false)
    setUsuarioForEmpresa(null)
    setUsuarioEmpresasDetalle(null)
    setEmpresaAsignarId('')
    setRolAsignarId('')
  }

  const handleAssignEmpresa = (event) => {
    event.preventDefault()
    if (!usuarioForEmpresa || !usuarioForEmpresa.id) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }

    // Global + Sin rol
    if (!empresaAsignarId && !rolAsignarId) {
      asignarGlobalSinRol()
      return
    }

    setIsSavingUsuarioEmpresa(true)
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const authHeaders = {
      Authorization: `Bearer ${token}`,
    }

    const recargarEmpresasUsuario = () =>
      fetch(`${backendBaseUrl}/api/usuarios/${usuarioForEmpresa.id}/empresas`, {
        headers: authHeaders,
      }).then((response) => {
        if (!response.ok) {
          throw new Error('ERROR_RECARGA_EMPRESAS')
        }
        return response.json()
      })

    const aplicarListaEmpresas = (lista) => {
      const safeLista = lista || []
      setUsuarioEmpresasDetalle(safeLista)
      setUsuariosData((anteriores) => {
        if (!anteriores) {
          return anteriores
        }
        const item = safeLista.length > 0 ? safeLista[0] : null
        const empresaId = item && item.empresaId != null ? item.empresaId : null
        const encontrada =
          empresaId != null && empresasData && Array.isArray(empresasData)
            ? empresasData.find((empresa) => empresa.id === empresaId)
            : null
        const empresaNombre =
          empresaId == null
            ? null
            : encontrada
            ? encontrada.nombre
            : String(empresaId)
        const rolNombre = item && item.rolNombre ? item.rolNombre : null
        return anteriores.map((usuario) => {
          if (usuario.id !== usuarioForEmpresa.id) {
            return usuario
          }
          return {
            ...usuario,
            empresas: empresaNombre ? [empresaNombre] : [],
            empresasDetalle:
              empresaNombre && rolNombre ? [`${empresaNombre} (${rolNombre})`] : [],
            empresaNombre: empresaNombre || null,
            empresaRolNombre: rolNombre || null,
          }
        })
      })
    }

    const quitarEmpresaActualSiExiste = () =>
      recargarEmpresasUsuario().then((lista) => {
        const empresaActualId =
          lista && Array.isArray(lista) && lista.length > 0 ? lista[0].empresaId : null
        if (empresaActualId == null) {
          return null
        }
        return fetch(
          `${backendBaseUrl}/api/usuarios/${usuarioForEmpresa.id}/empresas/${empresaActualId}`,
          {
            method: 'DELETE',
            headers: authHeaders,
          },
        ).then((response) => {
          if (response.status === 409) {
            throw new Error('CONFLICTO_QUITAR_EMPRESA')
          }
          if (!response.ok && response.status !== 404) {
            throw new Error('ERROR_QUITAR_EMPRESA')
          }
          return null
        })
      })

    const asignarRolGlobal = () =>
      fetch(`${backendBaseUrl}/api/usuarios/${usuarioForEmpresa.id}/roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rolId: rolAsignarId ? Number(rolAsignarId) : null,
        }),
      }).then((response) => {
        if (response.status === 409) {
          throw new Error('CONFLICTO_ROL')
        }
        if (!response.ok) {
          throw new Error('ERROR_ASIGNAR_ROL')
        }
        return null
      })

    const asignarEmpresaYRol = () => {
      if (!empresaAsignarId) {
        throw new Error('EMPRESA_REQUERIDA')
      }
      return fetch(`${backendBaseUrl}/api/usuarios/${usuarioForEmpresa.id}/empresas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          empresaId: Number(empresaAsignarId),
          rolId: rolAsignarId ? Number(rolAsignarId) : null,
        }),
      }).then((response) => {
        if (response.status === 409) {
          throw new Error('CONFLICTO_EMPRESA')
        }
        if (!response.ok) {
          throw new Error('ERROR_ASIGNAR_EMPRESA')
        }
        return null
      })
    }

    const flujo = !empresaAsignarId
      ? quitarEmpresaActualSiExiste().then(asignarRolGlobal)
      : asignarEmpresaYRol()

    flujo
      .then(() => recargarEmpresasUsuario())
      .then((lista) => {
        aplicarListaEmpresas(lista)
        setEmpresaAsignarId('')
        setRolAsignarId('')
        setError(null)
        if (showUsuarioEmpresaModal) {
          closeUsuarioEmpresaModal()
        }
      })
      .catch((err) => {
        if (err && err.message === 'CONFLICTO_EMPRESA') {
          setError('No se pudo asignar la empresa (conflicto).')
          return
        }
        if (err && err.message === 'CONFLICTO_ROL') {
          setError('El usuario ya tiene ese rol global.')
          return
        }
        if (err && err.message === 'EMPRESA_REQUERIDA') {
          setError('Debe seleccionar una empresa para asignar.')
          return
        }
        setError('No se pudo asignar la empresa al usuario.')
      })
      .finally(() => {
        setIsSavingUsuarioEmpresa(false)
      })
  }

  const openCreatePlan = () => {
    setEditingPlan(null)
    setPlanFormNombre('')
    setPlanFormDescripcion('')
    setPlanFormLimAlmacenes('')
    setPlanFormLimArmarios('')
    setPlanFormLimRepisas('')
    setPlanFormLimItems('')
    setPlanFormLimUsuarios('')
    setShowPlanFormModal(true)
  }

  const openEditPlan = (plan) => {
    setEditingPlan(plan)
    setPlanFormNombre(plan.nombre || '')
    setPlanFormDescripcion(plan.descripcion || '')
    setPlanFormLimAlmacenes(plan.limiteAlmacenes != null ? String(plan.limiteAlmacenes) : '')
    setPlanFormLimArmarios(plan.limiteArmarios != null ? String(plan.limiteArmarios) : '')
    setPlanFormLimRepisas(plan.limiteRepisas != null ? String(plan.limiteRepisas) : '')
    setPlanFormLimItems(plan.limiteItems != null ? String(plan.limiteItems) : '')
    setPlanFormLimUsuarios(plan.limiteUsuarios != null ? String(plan.limiteUsuarios) : '')
    setShowPlanFormModal(true)
  }

  const closePlanFormModal = () => {
    setEditingPlan(null)
    setShowPlanFormModal(false)
  }

  const handleSubmitPlan = (event) => {
    event.preventDefault()
    if (!planFormNombre.trim()) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    setIsSavingPlan(true)
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const payload = {
      nombre: planFormNombre.trim(),
      descripcion: planFormDescripcion.trim(),
      limiteAlmacenes: planFormLimAlmacenes ? Number(planFormLimAlmacenes) : null,
      limiteArmarios: planFormLimArmarios ? Number(planFormLimArmarios) : null,
      limiteRepisas: planFormLimRepisas ? Number(planFormLimRepisas) : null,
      limiteItems: planFormLimItems ? Number(planFormLimItems) : null,
      limiteUsuarios: planFormLimUsuarios ? Number(planFormLimUsuarios) : null,
    }
    const url = editingPlan
      ? `${backendBaseUrl}/api/planes-suscripcion/${editingPlan.id}`
      : `${backendBaseUrl}/api/planes-suscripcion`
    const method = editingPlan ? 'PUT' : 'POST'
    fetch(url, { method, headers, body: JSON.stringify(payload) })
      .then((response) => {
        if (response.status === 409) {
          throw new Error('NOMBRE_DUPLICADO')
        }
        if (!response.ok) {
          throw new Error('Error al guardar plan')
        }
        return response.json()
      })
      .then((guardado) => {
        setPlanesData((anteriores) => {
          if (!anteriores) {
            return [guardado]
          }
          if (editingPlan) {
            return anteriores.map((p) => (p.id === guardado.id ? guardado : p))
          }
          return [...anteriores, guardado]
        })
        closePlanFormModal()
        setError(null)
      })
      .catch((err) => {
        if (err && err.message === 'NOMBRE_DUPLICADO') {
          setError('Ya existe un plan con ese nombre.')
          return
        }
        setError('No se pudo guardar el plan.')
      })
      .finally(() => {
        setIsSavingPlan(false)
      })
  }

  const handleDeletePlan = (plan) => {
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    fetch(`${backendBaseUrl}/api/planes-suscripcion/${plan.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok && response.status !== 204) {
          throw new Error('Error al eliminar plan')
        }
        setPlanesData((anteriores) => {
          if (!anteriores) {
            return anteriores
          }
          return anteriores.filter((p) => p.id !== plan.id)
        })
        setError(null)
      })
      .catch(() => {
        setError('No se pudo eliminar el plan (puede estar en uso).')
      })
  }

  const loadEmpresaSuscripcion = (empresaId) => {
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    fetch(`${backendBaseUrl}/api/empresas/${empresaId}/suscripcion`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (response.status === 204) {
          return null
        }
        if (!response.ok) {
          return null
        }
        return response.json()
      })
      .then((data) => {
        setEmpresaSuscripciones((prev) => ({ ...prev, [empresaId]: data || null }))
      })
      .catch(() => {})
  }

  const openAsignarSuscripcion = (empresa) => {
    setEmpresaParaSuscripcion(empresa)
    setSuscripcionPlanId('')
    setSuscripcionFechaInicio(new Date().toISOString().split('T')[0])
    setSuscripcionFechaFin('')
    setShowAsignarSuscripcionModal(true)
    if (planesData === null) {
      const token = localStorage.getItem('maingest-token')
      if (token) {
        fetch(`${backendBaseUrl}/api/planes-suscripcion`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((json) => setPlanesData(json || []))
          .catch(() => {})
      }
    }
  }

  const handleAsignarSuscripcion = (event) => {
    event.preventDefault()
    if (!empresaParaSuscripcion || !suscripcionPlanId) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    setIsSavingSuscripcion(true)
    fetch(`${backendBaseUrl}/api/empresas/${empresaParaSuscripcion.id}/suscripciones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId: Number(suscripcionPlanId),
        fechaInicio: suscripcionFechaInicio || null,
        fechaFin: suscripcionFechaFin || null,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al asignar suscripción')
        }
        return response.json()
      })
      .then((data) => {
        setEmpresaSuscripciones((prev) => ({
          ...prev,
          [empresaParaSuscripcion.id]: data,
        }))
        setShowAsignarSuscripcionModal(false)
        setEmpresaParaSuscripcion(null)
        setError(null)
      })
      .catch(() => {
        setError('No se pudo asignar la suscripción.')
      })
      .finally(() => {
        setIsSavingSuscripcion(false)
      })
  }

  const openBloqueoModal = (empresa) => {
    setEmpresaParaBloqueo(empresa)
    setBloqueoMotivo('')
    setShowBloqueoModal(true)
  }

  const handleBloqueo = (bloquear) => {
    if (!empresaParaBloqueo) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    fetch(`${backendBaseUrl}/api/empresas/${empresaParaBloqueo.id}/bloqueo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bloqueada: bloquear,
        motivo: bloquear ? bloqueoMotivo : null,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cambiar bloqueo')
        }
        return response.json()
      })
      .then((empresaActualizada) => {
        setEmpresasData((anteriores) => {
          if (!anteriores) {
            return anteriores
          }
          return anteriores.map((e) =>
            e.id === empresaActualizada.id ? empresaActualizada : e,
          )
        })
        setShowBloqueoModal(false)
        setEmpresaParaBloqueo(null)
        setError(null)
      })
      .catch(() => {
        setError('No se pudo cambiar el estado de bloqueo.')
      })
  }

  const renderSection = () => {
    if (role === 'ADMIN') {
      if (activeSection === 'roles-globales') {
        return (
          <>
            <h2 className="admin-main-title">Roles</h2>
            <p className="admin-main-text">
              Define los roles globales y los que se usan por empresa, así como sus
              permisos.
            </p>
            <LocalNavBar />
          </>
        )
      }
      if (activeSection === 'usuarios') {
        return (
          <>
            <h2 className="admin-main-title">Usuarios</h2>
            <p className="admin-main-text">
              Administra cuentas globales, sus estados y sus accesos principales.
            </p>
            <LocalNavBar />
          </>
        )
      }
      if (activeSection === 'empresas') {
        return (
          <>
            <h2 className="admin-main-title">Empresas</h2>
            <p className="admin-main-text">
              Administra las empresas registradas, sus suscripciones y estado de bloqueo.
            </p>
            <LocalNavBar />
          </>
        )
      }
      if (activeSection === 'planes') {
        return (
          <>
            <h2 className="admin-main-title">Planes de suscripción</h2>
            <p className="admin-main-text">
              Crea y administra los planes con límites de almacenes, armarios, repisas, items y usuarios.
            </p>
            <LocalNavBar />
          </>
        )
      }
      if (activeSection === 'auditoria') {
        return (
          <>
            <h2 className="admin-main-title">Historial</h2>
            <p className="admin-main-text">
              Visualiza el historial de cambios importantes del sistema y accesos relevantes.
            </p>
            <LocalNavBar />
          </>
        )
      }
      return (
        <>
          <h2 className="admin-main-title">Resumen general</h2>
          <p className="admin-main-text">
            Vista general del sistema, pensada para supervisar roles, empresas y accesos.
          </p>
          <LocalNavBar />
        </>
      )
    }

    if (role === 'ADMIN_EMPRESA') {
      if (activeSection === 'usuarios-empresa') {
        return (
          <>
            <h2 className="admin-main-title">Usuarios de empresa</h2>
            <p className="admin-main-text">
              Gestiona usuarios internos de la empresa, sus permisos y estados.
            </p>
            <LocalNavBar />
          </>
        )
      }
      if (activeSection === 'almacenes-empresa') {
        return (
          <>
            <h2 className="admin-main-title">Almacenes</h2>
            <p className="admin-main-text">
              Configura los almacenes asociados a la empresa y los responsables de cada uno.
            </p>
            <LocalNavBar />
          </>
        )
      }
      return (
        <>
          <h2 className="admin-main-title">Resumen de empresa</h2>
          <p className="admin-main-text">
            Panel para ver el estado general de la empresa, usuarios y almacenes.
          </p>
          <LocalNavBar />
        </>
      )
    }

    if (activeSection === 'inventario') {
      return (
        <>
          <h2 className="admin-main-title">Inventario</h2>
          <p className="admin-main-text">
            Consulta existencias del almacén y prepara movimientos de entrada y salida.
          </p>
          <LocalNavBar />
        </>
      )
    }
    if (activeSection === 'movimientos') {
      return (
        <>
          <h2 className="admin-main-title">Movimientos</h2>
          <p className="admin-main-text">
            Revisa los movimientos recientes del almacén para controlar las operaciones.
          </p>
          <LocalNavBar />
        </>
      )
    }
    return (
      <>
        <h2 className="admin-main-title">Panel de almacén</h2>
        <p className="admin-main-text">
          Acceso rápido a las tareas diarias del almacén como inventario y movimientos.
        </p>
        <LocalNavBar />
      </>
    )
  }

  return (
    <main className="page admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-topbar-mark" />
          <span className="admin-topbar-title">Maingest</span>
        </div>
        <div className="admin-header-right">
          <Link to="/home" className="theme-button">
            Home
          </Link>
          <ThemeSelector theme={theme} onChange={onThemeChange} />
          <span className="admin-role-badge">{roleLabel}</span>
          <UserMenu />
          {success && (
            <div className="admin-success-notification">
              {success}
            </div>
          )}
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-logo" />
            <div className="admin-sidebar-title">
              {mode === 'users-roles' ? 'Usuarios y roles' : 'Administración'}
            </div>
          </div>
          <div className="admin-sidebar-nav admin-sidebar-nav-desktop">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`admin-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="admin-sidebar-nav-mobile" ref={mobileNavRef}>
            <button
              type="button"
              className={`admin-nav-dropdown-trigger ${mobileNavOpen ? 'open' : ''}`}
              onClick={() => setMobileNavOpen((current) => !current)}
              aria-expanded={mobileNavOpen}
            >
              <span>
                {sections.find((section) => section.id === activeSection)?.label || 'Seleccionar sección'}
              </span>
            </button>
            {mobileNavOpen && (
              <div className="admin-nav-dropdown-menu">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`admin-nav-dropdown-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSection(section.id)
                      setMobileNavOpen(false)
                    }}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
        <div className="admin-main">
          {renderSection()}
          <div className="admin-toolbar">
            {mode === 'users-roles' ? (
              <>
                <button
                  type="button"
                  className={`admin-toolbar-pill ${
                    (role === 'ADMIN' || (mode === 'users-roles' && role === 'ADMIN_EMPRESA')) &&
                    activeSection === 'usuarios'
                      ? 'primary'
                      : ''
                  }`}
                  onClick={() =>
                    (role === 'ADMIN' || (mode === 'users-roles' && role === 'ADMIN_EMPRESA')) &&
                    setActiveSection('usuarios')
                  }
                >
                  Usuarios
                </button>
                <button
                  type="button"
                  className={`admin-toolbar-pill ${
                    (role === 'ADMIN' || (mode === 'users-roles' && role === 'ADMIN_EMPRESA')) &&
                    activeSection === 'roles-globales'
                      ? 'primary'
                      : ''
                  }`}
                  onClick={() =>
                    (role === 'ADMIN' || (mode === 'users-roles' && role === 'ADMIN_EMPRESA')) &&
                    setActiveSection('roles-globales')
                  }
                >
                  Roles y permisos
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`admin-toolbar-pill ${
                    role === 'ADMIN' && activeSection === 'roles-globales'
                      ? 'primary'
                      : ''
                  }`}
                  onClick={() =>
                    role === 'ADMIN' && setActiveSection('roles-globales')
                  }
                >
                  Roles locales
                </button>
                <button
                  type="button"
                  className={`admin-toolbar-pill ${
                    role === 'ADMIN' && activeSection === 'empresas' ? 'primary' : ''
                  }`}
                  onClick={() => role === 'ADMIN' && setActiveSection('empresas')}
                >
                  Tablas
                </button>
                <button
                  type="button"
                  className={`admin-toolbar-pill ${
                    role === 'ADMIN' && activeSection === 'usuarios' ? 'primary' : ''
                  }`}
                  onClick={() => role === 'ADMIN' && setActiveSection('usuarios')}
                >
                  Permisos
                </button>
              </>
            )}
          </div>
          <div className="admin-table-shell">
            {(role === 'ADMIN' || (mode === 'users-roles' && role === 'ADMIN_EMPRESA')) &&
              activeSection === 'roles-globales' && (
              <>
                <div className="admin-table-actions">
                  <button
                    type="button"
                    className="theme-button"
                    onClick={openCreateRole}
                  >
                    Nuevo rol
                  </button>
                </div>
                <div className="admin-table-view-toggle">
                  <button
                    type="button"
                    className={tableViewMode === 'cards' ? 'active' : ''}
                    onClick={() => setTableViewMode('cards')}
                  >
                    Vista cards
                  </button>
                  <button
                    type="button"
                    className={tableViewMode === 'table' ? 'active' : ''}
                    onClick={() => setTableViewMode('table')}
                  >
                    Vista tabla
                  </button>
                </div>
                <table className={`admin-table ${tableViewMode === 'cards' ? 'admin-table--cards' : ''}`}>
                  <thead>
                    <tr>
                      <th>Nombre de rol</th>
                      <th>Descripción</th>
                      <th>Empresa / tipo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesData === null && !error && (
                      <tr>
                        <td>Cargando roles…</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td>{error}</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!error &&
                      rolesData &&
                      rolesData.map((rol) => {
                        const empresaTipoLabel = rol.empresaNombre || 'Global'
                        return (
                          <tr key={rol.id}>
                            <td data-label="Nombre de rol">{rol.nombre}</td>
                            <td data-label="Descripción">{rol.descripcion || '—'}</td>
                            <td data-label="Empresa / tipo">{empresaTipoLabel}</td>
                            <td data-label="Acciones">
                              <div className="acciones-buttons">
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openRolePermissions(rol)}
                                >
                                  Permisos
                                </button>
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openEditRole(rol)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openDeleteRole(rol)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </>
            )}
            {role === 'ADMIN' && activeSection === 'empresas' && (
              <>
                <div className="admin-table-actions">
                  <button
                    type="button"
                    className="theme-button"
                    onClick={openCreateEmpresa}
                  >
                    Nueva empresa
                  </button>
                </div>
                <div className="admin-table-view-toggle">
                  <button
                    type="button"
                    className={tableViewMode === 'cards' ? 'active' : ''}
                    onClick={() => setTableViewMode('cards')}
                  >
                    Vista cards
                  </button>
                  <button
                    type="button"
                    className={tableViewMode === 'table' ? 'active' : ''}
                    onClick={() => setTableViewMode('table')}
                  >
                    Vista tabla
                  </button>
                </div>
                <table className={`admin-table ${tableViewMode === 'cards' ? 'admin-table--cards' : ''}`}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Plan / Suscripción</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresasData === null && !error && (
                      <tr>
                        <td>Cargando empresas…</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td>{error}</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!error &&
                      empresasData &&
                      empresasData.map((empresa) => {
                        if (empresaSuscripciones[empresa.id] === undefined) {
                          loadEmpresaSuscripcion(empresa.id)
                        }
                        const sus = empresaSuscripciones[empresa.id] || null
                        const planLabel = sus ? sus.planNombre : 'Sin plan'
                        const diasLabel = sus && sus.diasRestantes != null
                          ? (sus.fechaFin ? `${sus.diasRestantes} días restantes` : 'Sin fecha fin')
                          : ''
                        const bloqueada = empresa.bloqueada === true
                        return (
                          <tr key={empresa.id}>
                            <td data-label="Empresa">
                              {empresa.nombre}
                              {bloqueada && (
                                <span style={{ color: 'var(--color-error, #e53935)', marginLeft: '0.5rem', fontWeight: 600, fontSize: '0.85em' }}>
                                  BLOQUEADA
                                </span>
                              )}
                            </td>
                            <td>
                              <div>{planLabel}</div>
                              {diasLabel && (
                                <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{diasLabel}</div>
                              )}
                              {sus && sus.fechaInicio && (
                                <div style={{ fontSize: '0.8em', opacity: 0.5 }}>
                                  {sus.fechaInicio} → {sus.fechaFin || '∞'}
                                </div>
                              )}
                            </td>
                            <td>
                              {bloqueada ? (
                                <span style={{ color: 'var(--color-error, #e53935)' }}>
                                  Bloqueada{empresa.motivoBloqueo ? `: ${empresa.motivoBloqueo}` : ''}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-success, #43a047)' }}>Activa</span>
                              )}
                            </td>
                            <td>
                              <div className="acciones-buttons">
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openAsignarSuscripcion(empresa)}
                                >
                                  Suscripción
                                </button>
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openBloqueoModal(empresa)}
                                >
                                  {bloqueada ? 'Desbloquear' : 'Bloquear'}
                                </button>
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openEditEmpresa(empresa)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openDeleteEmpresa(empresa)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </>
            )}
            {role === 'ADMIN' && activeSection === 'planes' && (
              <>
                <div className="admin-table-actions">
                  <button
                    type="button"
                    className="theme-button"
                    onClick={openCreatePlan}
                  >
                    Nuevo plan
                  </button>
                </div>
                <div className="admin-table-view-toggle">
                  <button
                    type="button"
                    className={tableViewMode === 'cards' ? 'active' : ''}
                    onClick={() => setTableViewMode('cards')}
                  >
                    Vista cards
                  </button>
                  <button
                    type="button"
                    className={tableViewMode === 'table' ? 'active' : ''}
                    onClick={() => setTableViewMode('table')}
                  >
                    Vista tabla
                  </button>
                </div>
                <table className={`admin-table ${tableViewMode === 'cards' ? 'admin-table--cards' : ''}`}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Límites</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planesData === null && !error && (
                      <tr>
                        <td>Cargando planes…</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td>{error}</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!error &&
                      planesData &&
                      planesData.map((plan) => {
                        const limites = []
                        if (plan.limiteAlmacenes != null) limites.push(`${plan.limiteAlmacenes} almacenes`)
                        if (plan.limiteArmarios != null) limites.push(`${plan.limiteArmarios} armarios`)
                        if (plan.limiteRepisas != null) limites.push(`${plan.limiteRepisas} repisas`)
                        if (plan.limiteItems != null) limites.push(`${plan.limiteItems} items`)
                        if (plan.limiteUsuarios != null) limites.push(`${plan.limiteUsuarios} usuarios`)
                        const limitesLabel = limites.length > 0 ? limites.join(' · ') : 'Ilimitado'
                        return (
                          <tr key={plan.id}>
                            <td data-label="Nombre">
                              {plan.nombre}
                              {plan.activo === false && (
                                <span style={{ opacity: 0.5, marginLeft: '0.5rem', fontSize: '0.85em' }}>
                                  (inactivo)
                                </span>
                              )}
                            </td>
                            <td data-label="Descripción">{plan.descripcion || '—'}</td>
                            <td data-label="Límites" style={{ fontSize: '0.9em' }}>{limitesLabel}</td>
                            <td data-label="Acciones">
                              <div className="acciones-buttons">
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openEditPlan(plan)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => handleDeletePlan(plan)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </>
            )}
            {(role === 'ADMIN' || (mode === 'users-roles' && role === 'ADMIN_EMPRESA')) &&
              activeSection === 'usuarios' && (
              <>
                <div className="admin-table-actions">
                  <button
                    type="button"
                    className="theme-button"
                    onClick={openCreateUsuario}
                  >
                    Nuevo usuario
                  </button>
                </div>
                <div className="admin-table-filters">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o correo"
                    value={usuarioFilterText}
                    onChange={(event) => setUsuarioFilterText(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por empresa"
                    value={usuarioFilterEmpresa}
                    onChange={(event) => setUsuarioFilterEmpresa(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por rol"
                    value={usuarioFilterRol}
                    onChange={(event) => setUsuarioFilterRol(event.target.value)}
                  />
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Correo</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Empresa / Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosData === null && !error && (
                      <tr>
                        <td>Cargando usuarios…</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td>{error}</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!error &&
                      usuariosData &&
                      usuariosData
                        .filter((usuario) => {
                      const texto = usuarioFilterText.toLowerCase()
                      const empresaFiltro = usuarioFilterEmpresa.toLowerCase()
                      const rolFiltro = usuarioFilterRol.toLowerCase()
                      const nombre = (usuario.nombre || '').toLowerCase()
                      const correo = (usuario.correo || '').toLowerCase()
                      const empresasBase = Array.isArray(usuario.empresas)
                        ? usuario.empresas
                        : []
                      const empresaNombreRaw =
                        usuario.empresaNombre ||
                        (empresasBase.length > 0 ? empresasBase[0] : '')
                      const empresaNombre = (empresaNombreRaw || '').toLowerCase()
                      const roles = Array.isArray(usuario.roles) ? usuario.roles : []
                      const rolEmpresa = (usuario.empresaRolNombre || '').toLowerCase()
                      const coincideTexto =
                        !texto || nombre.includes(texto) || correo.includes(texto)
                      const coincideEmpresa =
                        !empresaFiltro ||
                        empresaNombre.includes(empresaFiltro)
                      const coincideRol =
                        !rolFiltro ||
                        rolEmpresa.includes(rolFiltro) ||
                        roles.some((rol) => rol && rol.toLowerCase().includes(rolFiltro))
                      return coincideTexto && coincideEmpresa && coincideRol
                        })
                        .map((usuario) => {
                      const empresasBase = Array.isArray(usuario.empresas)
                        ? usuario.empresas
                        : []
                      const roles = Array.isArray(usuario.roles) ? usuario.roles : []
                      const etiquetaEmpresas =
                        usuario.empresaNombre ||
                        (empresasBase.length > 0 ? empresasBase[0] : 'Global')
                      const etiquetaRoles =
                        usuario.empresaRolNombre ||
                        (roles.length > 0 ? roles.join(', ') : 'Sin rol')
                      return (
                        <tr key={usuario.id}>
                          <td data-label="Correo">{usuario.correo}</td>
                          <td data-label="Nombre">{usuario.nombre}</td>
                          <td data-label="Rol">{etiquetaRoles}</td>
                          <td data-label="Empresa / Estado">
                            {etiquetaEmpresas}
                            {usuario.estado ? ` · ${usuario.estado}` : ''}
                            <div>
                              <div className="acciones-buttons">
                                <button
                                  type="button"
                                  className="theme-button"
                                  onClick={() => openEditUsuario(usuario)}
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                        })}
                  </tbody>
                </table>
              </>
            )}
            {(role === 'ADMIN' || (mode === 'users-roles' && role === 'ADMIN_EMPRESA')) &&
              activeSection === 'auditoria' && (
              <>
                <div className="admin-table-filters">
                  <input
                    type="text"
                    placeholder="Filtrar por usuario"
                    value={auditoriaFilterUsuario}
                    onChange={(event) => setAuditoriaFilterUsuario(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por tipo de objeto"
                    value={auditoriaFilterObjeto}
                    onChange={(event) => setAuditoriaFilterObjeto(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por acción"
                    value={auditoriaFilterAccion}
                    onChange={(event) => setAuditoriaFilterAccion(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Buscar en descripción"
                    value={auditoriaFilterTexto}
                    onChange={(event) => setAuditoriaFilterTexto(event.target.value)}
                  />
                  <button
                    type="button"
                    className="theme-button"
                    disabled={isLoadingAuditoria}
                    onClick={() => {
                      const token = localStorage.getItem('maingest-token')
                      if (!token) {
                        return
                      }
                      const headers = {
                        Authorization: `Bearer ${token}`,
                      }
                      const params = new URLSearchParams()
                      if (auditoriaFilterUsuario.trim()) {
                        params.append('usuarioCorreo', auditoriaFilterUsuario.trim())
                      }
                      if (auditoriaFilterObjeto.trim()) {
                        params.append('objetoTipo', auditoriaFilterObjeto.trim())
                      }
                      if (auditoriaFilterAccion.trim()) {
                        params.append('accion', auditoriaFilterAccion.trim())
                      }
                      if (auditoriaFilterTexto.trim()) {
                        params.append('texto', auditoriaFilterTexto.trim())
                      }
                      const query = params.toString()
                      setIsLoadingAuditoria(true)
                      fetch(
                        `${backendBaseUrl}/api/auditoria${query ? `?${query}` : ''}`,
                        {
                          headers,
                        },
                      )
                        .then((response) => {
                          if (!response.ok) {
                            throw new Error('Error al cargar historial')
                          }
                          return response.json()
                        })
                        .then((json) => {
                          setAuditoriaData(json || [])
                          setError(null)
                        })
                        .catch(() => {
                          setError('No se pudo cargar el historial de acciones.')
                        })
                        .finally(() => {
                          setIsLoadingAuditoria(false)
                        })
                    }}
                  >
                    {isLoadingAuditoria ? 'Cargando…' : 'Aplicar filtros'}
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Acción</th>
                      <th>Objeto</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingAuditoria && !error && (
                      <tr>
                        <td>Cargando historial…</td>
                        <td />
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td>{error}</td>
                        <td />
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!error &&
                      !isLoadingAuditoria &&
                      auditoriaData &&
                      auditoriaData.map((evento) => {
                        const fecha = evento.creadoEn
                          ? new Date(evento.creadoEn).toLocaleString()
                          : ''
                        const objetoLabel =
                          evento.objetoTipo && evento.objetoId
                            ? `${evento.objetoTipo} #${evento.objetoId}`
                            : evento.objetoTipo || ''
                        return (
                          <tr key={evento.id}>
                            <td data-label="Fecha">{fecha}</td>
                            <td data-label="Usuario">{evento.usuarioCorreo || evento.usuarioId || '—'}</td>
                            <td data-label="Acción">{evento.accion}</td>
                            <td data-label="Objeto">{objetoLabel}</td>
                            <td data-label="Detalle">{evento.descripcion || 'Sin descripción'}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </>
            )}
            {!(
              role === 'ADMIN' &&
              (activeSection === 'roles-globales' ||
                activeSection === 'empresas' ||
                activeSection === 'usuarios' ||
                activeSection === 'planes' ||
                activeSection === 'auditoria')
            ) && (
              <div className="admin-table-header">
                <div className="admin-table-cell">Nombre</div>
                <div className="admin-table-cell">Tipo</div>
                <div className="admin-table-cell">Estado</div>
                <div className="admin-table-cell">Última actualización</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showRoleFormModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">{editingRole ? 'Editar rol' : 'Nuevo rol'}</h3>
            <p className="modal-text">
              {editingRole
                ? 'Actualiza el nombre y la descripción del rol.'
                : 'Crea un nuevo rol basado en permisos. Luego podrás definir qué puede ver, crear, editar y eliminar.'}
            </p>
            <form className="modal-form" onSubmit={handleSubmitRole}>
              <input
                type="text"
                placeholder="Nombre de rol"
                value={roleFormNombre}
                onChange={(event) => setRoleFormNombre(event.target.value)}
              />
              <input
                type="text"
                placeholder="Descripción"
                value={roleFormDescripcion}
                onChange={(event) => setRoleFormDescripcion(event.target.value)}
              />
              <select
                value={roleFormEmpresaId}
                onChange={(event) => setRoleFormEmpresaId(event.target.value)}
              >
                <option value="">Global</option>
                {empresasData &&
                  empresasData.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
              </select>
              <div className="modal-actions">
                <button
                  type="button"
                  className="theme-button"
                  onClick={closeRoleFormModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="theme-button"
                  disabled={isSavingRole || !roleFormNombre.trim()}
                >
                  {isSavingRole ? 'Guardando…' : editingRole ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showUsuarioFormModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">
              {editingUsuario ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>
            <p className="modal-text">
              {editingUsuario
                ? 'Actualiza los datos principales del usuario.'
                : 'Crea un nuevo usuario global para que pueda acceder al sistema.'}
            </p>
            <form className="modal-form" onSubmit={handleSubmitUsuario}>
              <input
                type="email"
                placeholder="Correo"
                value={usuarioFormCorreo}
                onChange={(event) => setUsuarioFormCorreo(event.target.value)}
              />
              <input
                type="text"
                placeholder="Nombre"
                value={usuarioFormNombre}
                onChange={(event) => setUsuarioFormNombre(event.target.value)}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={usuarioFormClave}
                onChange={(event) => setUsuarioFormClave(event.target.value)}
              />
              {editingUsuario && role === 'ADMIN' && (
                <>
                  <div className="modal-text">Rol del usuario</div>
                  <select
                    value={empresaAsignarId}
                    onChange={(event) => {
                      setEmpresaAsignarId(event.target.value)
                      setRolAsignarId('')
                      setUsuarioEmpresaDirty(true)
                    }}
                  >
                    <option value="">Global</option>
                    {empresasData &&
                      empresasData.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nombre}
                        </option>
                      ))}
                  </select>
                  <select
                    value={rolAsignarId}
                    onChange={(event) => {
                      setRolAsignarId(event.target.value)
                      setUsuarioEmpresaDirty(true)
                    }}
                  >
                    <option value="">Sin rol</option>
                    {rolesData &&
                      rolesData
                        .filter((rol) => {
                          if (!empresaAsignarId) {
                            return rol.empresaId == null
                          }
                          return (
                            rol.empresaId != null &&
                            Number(rol.empresaId) === Number(empresaAsignarId)
                          )
                        })
                        .map((rol) => (
                          <option key={rol.id} value={rol.id}>
                            {rol.nombre}
                          </option>
                        ))}
                  </select>
                  {usuarioEmpresasDetalle && usuarioEmpresasDetalle.length > 0 && (
                    <div className="role-permissions-list">
                      {usuarioEmpresasDetalle.map((item) => {
                        const empresaNombre =
                          empresasData && Array.isArray(empresasData)
                            ? (() => {
                                const encontrada = empresasData.find(
                                  (empresa) => empresa.id === item.empresaId,
                                )
                                return encontrada
                                  ? encontrada.nombre
                                  : item.empresaId
                              })()
                            : item.empresaId
                        const rolNombre = item.rolNombre || 'Sin rol'
                        return (
                          <div
                            key={`${item.empresaId}-${item.usuarioId}-${rolNombre}`}
                            className="role-permission-item"
                          >
                            <span className="role-permission-main">
                              <span className="role-permission-name">
                                {empresaNombre}
                              </span>
                              <span className="role-permission-meta">
                                {rolNombre}
                              </span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
              <select
                value={usuarioFormEstado}
                onChange={(event) => setUsuarioFormEstado(event.target.value)}
              >
                <option value="">Selecciona un estado</option>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
              <div className="modal-actions">
                <button
                  type="button"
                  className="theme-button"
                  onClick={closeUsuarioFormModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="theme-button"
                  disabled={
                    isSavingUsuario ||
                    (!editingUsuario &&
                      (!usuarioFormCorreo.trim() ||
                        !usuarioFormNombre.trim() ||
                        !usuarioFormClave.trim() ||
                        !usuarioFormEstado.trim()))
                  }
                >
                  {isSavingUsuario
                    ? 'Guardando…'
                    : editingUsuario
                    ? 'Guardar'
                    : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showUsuarioEmpresaModal && usuarioForEmpresa && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Empresas del usuario</h3>
            <p className="modal-text">
              Asigna el usuario "{usuarioForEmpresa.correo}" a una empresa o un rol global.
            </p>
            {console.log('Modal renderizado, empresaAsignarId:', empresaAsignarId, 'rolAsignarId:', rolAsignarId)}
            <form className="modal-form" onSubmit={handleAssignEmpresa}>
              <select
                value={empresaAsignarId}
                onChange={(event) => {
                  setEmpresaAsignarId(event.target.value)
                  setRolAsignarId('')
                }}
              >
                <option value="">Global</option>
                {empresasData &&
                  empresasData.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
              </select>
              <select
                value={rolAsignarId}
                onChange={(event) => setRolAsignarId(event.target.value)}
              >
                <option value="">Sin rol</option>
                {rolesData &&
                  rolesData
                    .filter((rol) => {
                      console.log('Filtrando rol:', rol, 'empresaAsignarId:', empresaAsignarId)
                      if (!empresaAsignarId) {
                        return rol.empresaId == null
                      }
                      return (
                        rol.empresaId != null &&
                        Number(rol.empresaId) === Number(empresaAsignarId)
                      )
                    })
                    .map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
              </select>
              {usuarioEmpresasDetalle && usuarioEmpresasDetalle.length > 0 && (
                <div className="role-permissions-list">
                  {usuarioEmpresasDetalle.map((item) => {
                    const empresaNombre =
                      empresasData && Array.isArray(empresasData)
                        ? (() => {
                            const encontrada = empresasData.find(
                              (empresa) => empresa.id === item.empresaId,
                            )
                            return encontrada
                              ? encontrada.nombre
                              : item.empresaId
                          })()
                        : item.empresaId
                    const rolNombre = item.rolNombre || 'Sin rol'
                    return (
                      <div
                        key={`${item.empresaId}-${item.usuarioId}-${rolNombre}`}
                        className="role-permission-item"
                      >
                        <span className="role-permission-main">
                          <span className="role-permission-name">
                            {empresaNombre}
                          </span>
                          <span className="role-permission-meta">
                            {rolNombre}
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="theme-button"
                  onClick={closeUsuarioEmpresaModal}
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="theme-button"
                  disabled={isSavingUsuarioEmpresa}
                >
                  {isSavingUsuarioEmpresa ? 'Asignando…' : 'Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showRolePermissionsModal && roleForPermisos && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Permisos de rol</h3>
            <p className="modal-text">
              Activa o desactiva los permisos para el rol "{roleForPermisos.nombre}".
            </p>
            <div className="modal-form">
              <input
                type="text"
                placeholder="Filtrar permisos por nombre o área"
                value={permisoFilterText}
                onChange={(event) => setPermisoFilterText(event.target.value)}
              />
              {(!permisosCatalogo || isLoadingRolePermisos) && (
                <div className="modal-text">Cargando permisos…</div>
              )}
              {permisosCatalogo &&
                !isLoadingRolePermisos &&
                permisosCatalogo.length === 0 && (
                  <div className="modal-text">
                    No hay permisos configurados en el sistema.
                  </div>
                )}
              {permisosCatalogo && permisosCatalogo.length > 0 && (
                <div className="role-permissions-list">
                  {Object.values(
                    [...permisosCatalogo]
                      .filter((permiso) => {
                        const texto = permisoFilterText.trim().toLowerCase()
                        if (!texto) {
                          return true
                        }
                        const nombre = (permiso.nombre || '').toLowerCase()
                        const area = (permiso.area || '').toLowerCase()
                        const codigo =
                          permiso.codigo != null ? String(permiso.codigo) : ''
                        const etiquetaAreaCodigo = `${area}.${codigo}`.toLowerCase()
                        return (
                          nombre.includes(texto) ||
                          area.includes(texto) ||
                          codigo.includes(texto) ||
                          etiquetaAreaCodigo.includes(texto)
                        )
                      })
                      .reduce((acumulado, permiso) => {
                        const nombre = permiso.nombre || ''
                        const nombreParts = nombre.split('.')
                        const moduloRaw =
                          (nombreParts[0] || permiso.area || 'otro').toLowerCase()
                        const accionRaw =
                          (nombreParts[1] ||
                            (permiso.codigo != null
                              ? String(permiso.codigo)
                              : 'otro')
                          ).toLowerCase()
                        const moduloKey = moduloRaw
                        const accionKey = accionRaw
                        if (!acumulado[moduloKey]) {
                          acumulado[moduloKey] = {
                            moduloKey,
                            acciones: {},
                          }
                        }
                        if (!acumulado[moduloKey].acciones[accionKey]) {
                          acumulado[moduloKey].acciones[accionKey] = []
                        }
                        acumulado[moduloKey].acciones[accionKey].push(permiso)
                        return acumulado
                      }, {}),
                  )
                    .sort((a, b) => a.moduloKey.localeCompare(b.moduloKey))
                    .map((grupoModulo) => {
                      const moduloLabel =
                        grupoModulo.moduloKey.charAt(0).toUpperCase() +
                        grupoModulo.moduloKey.slice(1)
                      const accionesNormalizadas = {}
                      Object.entries(grupoModulo.acciones).forEach(
                        ([accionKey, permisos]) => {
                          const baseKey =
                            accionKey === '1' || accionKey === 'ver'
                              ? 'ver'
                              : accionKey === '2' ||
                                accionKey === 'crear' ||
                                accionKey === 'agregar'
                              ? 'crear'
                              : accionKey === '3' ||
                                accionKey === 'editar' ||
                                accionKey === 'modificar'
                              ? 'editar'
                              : accionKey === '4' ||
                                accionKey === 'eliminar' ||
                                accionKey === 'borrar'
                              ? 'eliminar'
                              : accionKey === '5' || accionKey === 'roles'
                              ? 'roles'
                              : accionKey
                          if (!accionesNormalizadas[baseKey]) {
                            accionesNormalizadas[baseKey] = []
                          }
                          accionesNormalizadas[baseKey].push(...permisos)
                        },
                      )
                      const baseAccionesOrden = ['ver', 'crear', 'editar', 'eliminar', 'roles']
                      const extraAcciones = Object.keys(
                        accionesNormalizadas,
                      ).filter((nombre) => !baseAccionesOrden.includes(nombre))
                      const moduloActivo = baseAccionesOrden.some((accionBase) => {
                        const permisosAccion =
                          accionesNormalizadas[accionBase] || []
                        return permisosAccion.some((permiso) =>
                          rolePermisos.some((item) => item.id === permiso.id),
                        )
                      })
                      return (
                        <div
                          key={grupoModulo.moduloKey}
                          className={`role-permission-item ${
                            moduloActivo ? 'active' : ''
                          }`}
                        >
                          <span className="role-permission-main">
                            <span className="role-permission-name">
                              {moduloLabel}
                            </span>
                            {extraAcciones.length > 0 && (
                              <span className="role-permission-meta">
                                {`Otros: ${extraAcciones.join(', ')}`}
                              </span>
                            )}
                          </span>
                          <div className="role-permission-crud">
                            {baseAccionesOrden.map((accionBase) => {
                              const permisosAccion =
                                accionesNormalizadas[accionBase] || []
                              const todosAsignados =
                                permisosAccion.length > 0 &&
                                permisosAccion.every((permiso) =>
                                  rolePermisos.some(
                                    (item) => item.id === permiso.id,
                                  ),
                                )
                              const algunoAsignado = permisosAccion.some(
                                (permiso) =>
                                  rolePermisos.some(
                                    (item) => item.id === permiso.id,
                                  ),
                              )
                              const deshabilitado = permisosAccion.some(
                                (permiso) =>
                                  updatingPermisoIds.includes(permiso.id),
                              )
                              const handleToggleAccion = () => {
                                const objetivoAsignar = !todosAsignados
                                permisosAccion.forEach((permiso) => {
                                  const asignado = rolePermisos.some(
                                    (item) => item.id === permiso.id,
                                  )
                                  if (objetivoAsignar !== asignado) {
                                    toggleRolePermiso(permiso)
                                  }
                                })
                              }
                              const etiquetaAccion =
                                accionBase.charAt(0).toUpperCase() +
                                accionBase.slice(1)
                              return (
                                <button
                                  key={accionBase}
                                  type="button"
                                  className={`role-permission-crud-button ${
                                    algunoAsignado ? 'active' : ''
                                  }`}
                                  disabled={
                                    deshabilitado || permisosAccion.length === 0
                                  }
                                  onClick={handleToggleAccion}
                                >
                                  {etiquetaAccion}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="theme-button"
                  onClick={closeRolePermissionsModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteRoleModal && roleToDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Eliminar rol</h3>
            <p className="modal-text">
              ¿Seguro que quieres eliminar el rol "{roleToDelete.nombre}"? Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setRoleToDelete(null)
                  setShowDeleteRoleModal(false)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                onClick={handleDeleteRole}
                disabled={isDeletingRole}
              >
                {isDeletingRole ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteRoleReassignModal && roleToDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Eliminar rol en uso</h3>
            <p className="modal-text">
              El rol "{roleToDelete.nombre}" está asignado a usuarios. Elige qué hacer con esos usuarios.
            </p>
            <div className="modal-form">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={deleteRoleDejarSinRol}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setDeleteRoleDejarSinRol(checked)
                    if (checked) {
                      setDeleteRoleNuevoRolId('')
                    }
                  }}
                />
                Dejar a los usuarios sin rol
              </label>
              {!deleteRoleDejarSinRol && (
                <select
                  value={deleteRoleNuevoRolId}
                  onChange={(event) => setDeleteRoleNuevoRolId(event.target.value)}
                >
                  <option value="">Selecciona rol de reemplazo</option>
                  {(rolesData || [])
                    .filter((rol) => rol && rol.id && rol.id !== roleToDelete.id)
                    .map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
                </select>
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  closeDeleteRoleReassignModal()
                  setRoleToDelete(null)
                }}
                disabled={isDeletingRole}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                onClick={handleDeleteRoleWithReassign}
                disabled={isDeletingRole}
              >
                {isDeletingRole ? 'Eliminando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showEmpresaFormModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">
              {editingEmpresa ? 'Editar empresa' : 'Nueva empresa'}
            </h3>
            <p className="modal-text">
              {editingEmpresa
                ? 'Actualiza el nombre de la empresa seleccionada.'
                : 'Crea una nueva empresa para administrar usuarios y accesos.'}
            </p>
            <form className="modal-form" onSubmit={handleSubmitEmpresa}>
              <input
                type="text"
                placeholder="Nombre de empresa"
                value={empresaFormNombre}
                onChange={(event) => setEmpresaFormNombre(event.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="theme-button"
                  onClick={closeEmpresaFormModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="theme-button"
                  disabled={isSavingEmpresa || !empresaFormNombre.trim()}
                >
                  {isSavingEmpresa ? 'Guardando…' : editingEmpresa ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteEmpresaModal && empresaToDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Eliminar empresa</h3>
            <p className="modal-text">
              ¿Seguro que quieres eliminar la empresa "{empresaToDelete.nombre}"? Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setEmpresaToDelete(null)
                  setShowDeleteEmpresaModal(false)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                onClick={handleDeleteEmpresa}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {showPlanFormModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">
              {editingPlan ? 'Editar plan' : 'Nuevo plan de suscripción'}
            </h3>
            <p className="modal-text">
              {editingPlan
                ? 'Actualiza el nombre, descripción y límites del plan.'
                : 'Crea un nuevo plan con los límites que necesites. Deja un campo vacío para "ilimitado".'}
            </p>
            <form className="modal-form" onSubmit={handleSubmitPlan}>
              <input
                type="text"
                placeholder="Nombre del plan"
                value={planFormNombre}
                onChange={(event) => setPlanFormNombre(event.target.value)}
              />
              <input
                type="text"
                placeholder="Descripción"
                value={planFormDescripcion}
                onChange={(event) => setPlanFormDescripcion(event.target.value)}
              />
              <input
                type="number"
                placeholder="Límite de almacenes (vacío = ilimitado)"
                min="0"
                value={planFormLimAlmacenes}
                onChange={(event) => setPlanFormLimAlmacenes(event.target.value)}
              />
              <input
                type="number"
                placeholder="Límite de armarios (vacío = ilimitado)"
                min="0"
                value={planFormLimArmarios}
                onChange={(event) => setPlanFormLimArmarios(event.target.value)}
              />
              <input
                type="number"
                placeholder="Límite de repisas (vacío = ilimitado)"
                min="0"
                value={planFormLimRepisas}
                onChange={(event) => setPlanFormLimRepisas(event.target.value)}
              />
              <input
                type="number"
                placeholder="Límite de items (vacío = ilimitado)"
                min="0"
                value={planFormLimItems}
                onChange={(event) => setPlanFormLimItems(event.target.value)}
              />
              <input
                type="number"
                placeholder="Límite de usuarios (vacío = ilimitado)"
                min="0"
                value={planFormLimUsuarios}
                onChange={(event) => setPlanFormLimUsuarios(event.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="theme-button"
                  onClick={closePlanFormModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="theme-button"
                  disabled={isSavingPlan || !planFormNombre.trim()}
                >
                  {isSavingPlan ? 'Guardando…' : editingPlan ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAsignarSuscripcionModal && empresaParaSuscripcion && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Asignar suscripción</h3>
            <p className="modal-text">
              Asigna un plan de suscripción a la empresa "{empresaParaSuscripcion.nombre}".
            </p>
            <form className="modal-form" onSubmit={handleAsignarSuscripcion}>
              <select
                value={suscripcionPlanId}
                onChange={(event) => setSuscripcionPlanId(event.target.value)}
              >
                <option value="">Selecciona un plan</option>
                {planesData &&
                  planesData
                    .filter((p) => p.activo !== false)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre}
                      </option>
                    ))}
              </select>
              <input
                type="date"
                value={suscripcionFechaInicio}
                onChange={(event) => setSuscripcionFechaInicio(event.target.value)}
              />
              <input
                type="date"
                value={suscripcionFechaFin}
                onChange={(event) => setSuscripcionFechaFin(event.target.value)}
              />
              {suscripcionFechaInicio && suscripcionFechaFin && (
                <div className="modal-text" style={{ fontSize: '0.9em', opacity: 0.7 }}>
                  Duración: {Math.max(0, Math.ceil((new Date(suscripcionFechaFin) - new Date(suscripcionFechaInicio)) / (1000 * 60 * 60 * 24)))} días
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="theme-button"
                  onClick={() => {
                    setShowAsignarSuscripcionModal(false)
                    setEmpresaParaSuscripcion(null)
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="theme-button"
                  disabled={isSavingSuscripcion || !suscripcionPlanId}
                >
                  {isSavingSuscripcion ? 'Asignando…' : 'Asignar plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showBloqueoModal && empresaParaBloqueo && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">
              {empresaParaBloqueo.bloqueada ? 'Desbloquear empresa' : 'Bloquear empresa'}
            </h3>
            <p className="modal-text">
              {empresaParaBloqueo.bloqueada
                ? `La empresa "${empresaParaBloqueo.nombre}" está bloqueada. ¿Deseas desbloquearla?`
                : `¿Seguro que quieres bloquear la empresa "${empresaParaBloqueo.nombre}"?`}
            </p>
            {!empresaParaBloqueo.bloqueada && (
              <div className="modal-form">
                <input
                  type="text"
                  placeholder="Motivo del bloqueo (opcional)"
                  value={bloqueoMotivo}
                  onChange={(event) => setBloqueoMotivo(event.target.value)}
                />
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setShowBloqueoModal(false)
                  setEmpresaParaBloqueo(null)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                onClick={() => handleBloqueo(!empresaParaBloqueo.bloqueada)}
              >
                {empresaParaBloqueo.bloqueada ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default AdminPage
