import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import AlmacenShapeEditor from '../components/AlmacenShapeEditor'
import { useAuth } from '../context/AuthContext'
import { backendBaseUrl } from '../utils/config'
import {
  createDefaultAlmacenShape,
  getAlmacenShapeAspectRatio,
  sanitizeAlmacenShapePoints,
  normalizeShape,
  parseAlmacenShapePointsFromEstilos,
  renderAlmacenShape
} from '../utils/shapeUtils'

const AlmacenesPage = ({ theme, onThemeChange }) => {
  const navigate = useNavigate()
  const { canView, canCreate, canEdit, canDelete } = useAuth()
  const [empresas, setEmpresas] = useState(null)
  const [almacenes, setAlmacenes] = useState(null)
  const [selectedAlmacenId, setSelectedAlmacenId] = useState(null)
  const [estructura, setEstructura] = useState(null)
  const [almacenShapePoints, setAlmacenShapePoints] = useState(() => createDefaultAlmacenShape())
  const [formNombreAlmacen, setFormNombreAlmacen] = useState('')
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [isSavingAlmacen, setIsSavingAlmacen] = useState(false)
  const [armarioForRepisa, setArmarioForRepisa] = useState(null)
  const [formRepisaNivel, setFormRepisaNivel] = useState('')
  const [formRepisaCapacidad, setFormRepisaCapacidad] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success] = useState(null)
  const [activeSection, setActiveSection] = useState('almacenes')
  const [inventarioData, setInventarioData] = useState(null)
  const [repisasGlobalData, setRepisasGlobalData] = useState(null)
  const [isLoadingRepisasGlobal, setIsLoadingRepisasGlobal] = useState(false)
  const [isLoadingInventario, setIsLoadingInventario] = useState(false)
  const [almacenFilterNombre, setAlmacenFilterNombre] = useState('')
  const [almacenFilterEmpresa, setAlmacenFilterEmpresa] = useState('')
  const [inventarioFilterEmpresa, setInventarioFilterEmpresa] = useState('')
  const [inventarioFilterAlmacen, setInventarioFilterAlmacen] = useState('')
  const [inventarioFilterItem, setInventarioFilterItem] = useState('')
  const [armariosFilterEmpresa, setArmariosFilterEmpresa] = useState('')
  const [armariosFilterAlmacen, setArmariosFilterAlmacen] = useState('')
  const [armariosFilterArmario, setArmariosFilterArmario] = useState('')
  const [visualizarArmarioFilter, setVisualizarArmarioFilter] = useState('')
  const [showCreateItemModal, setShowCreateItemModal] = useState(false)
  const [formItemEmpresaId, setFormItemEmpresaId] = useState('')
  const [formItemAlmacenId, setFormItemAlmacenId] = useState('')
  const [formItemArmarioId, setFormItemArmarioId] = useState('')
  const [formItemRepisaId, setFormItemRepisaId] = useState('')
  const [formItemNombre, setFormItemNombre] = useState('')
  const [formItemEstado, setFormItemEstado] = useState('BUENO')
  const [formItemTamanio, setFormItemTamanio] = useState('1')
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [showCreateAlmacenModal, setShowCreateAlmacenModal] = useState(false)
  const [showEditAlmacenModal, setShowEditAlmacenModal] = useState(false)
  const [editingAlmacen, setEditingAlmacen] = useState(null)
  const [editNombreAlmacen, setEditNombreAlmacen] = useState('')
  const [editAlmacenShapePoints, setEditAlmacenShapePoints] = useState(() =>
    createDefaultAlmacenShape(),
  )
  const [isUpdatingAlmacen, setIsUpdatingAlmacen] = useState(false)
  const [almacenToDelete, setAlmacenToDelete] = useState(null)
  const [isDeletingAlmacen, setIsDeletingAlmacen] = useState(false)
  const [showCreateArmarioModal, setShowCreateArmarioModal] = useState(false)
  const [formArmarioNombre, setFormArmarioNombre] = useState('')
  const [formArmarioAncho, setFormArmarioAncho] = useState('0.12')
  const [formArmarioAlto, setFormArmarioAlto] = useState('0.6')
  const [formArmarioAlmacenId, setFormArmarioAlmacenId] = useState('')
  const [formArmarioEmpresaId, setFormArmarioEmpresaId] = useState('')
  const [formArmarioMeasureMode, setFormArmarioMeasureMode] = useState('metros')
  const [isSavingArmario, setIsSavingArmario] = useState(false)
  const role = localStorage.getItem('maingest-role') || 'ADMIN'
  const isGlobalUser = role === 'ADMIN'
  const roleLabel =
    role === 'ADMIN' ? 'Super administrador' : role === 'ADMIN_EMPRESA' ? 'Admin de empresa' : 'Admin de almacén'
  const canvasRef = useRef(null)
  const dragArmarioRef = useRef(null)
  const [draggingArmarioId, setDraggingArmarioId] = useState(null)
  const [selectedArmarioIdForEdit, setSelectedArmarioIdForEdit] = useState(null)
  const [canvasStyle, setCanvasStyle] = useState({})
  const [canvasBaseSize, setCanvasBaseSize] = useState({ width: 0, height: 0 })
  const [almacenZoom, setAlmacenZoom] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const clampZoom = (value) => Math.min(3, Math.max(0.5, value))

  useEffect(() => {
    if (!canvasRef.current || !selectedAlmacenId || !almacenes) {
      return
    }
    const almacen = almacenes.find((a) => a.id === selectedAlmacenId)
    if (!almacen) return

    const ratio = getAlmacenShapeAspectRatio(almacen.estilos)

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
  }, [selectedAlmacenId, almacenes, estructura])

  useEffect(() => {
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    Promise.resolve().then(() => {
      setIsLoading(true)
    })
    Promise.all([
      fetch(`${backendBaseUrl}/api/empresas`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${backendBaseUrl}/api/almacenes`, {
        headers,
        cache: 'no-store',
      }),
    ])
      .then(async ([empresasRes, almacenesRes]) => {
        if (!empresasRes.ok || !almacenesRes.ok) {
          throw new Error('Error al cargar datos')
        }
        const empresasJson = await empresasRes.json()
        const almacenesJson = await almacenesRes.json()
        setEmpresas(empresasJson || [])
        setAlmacenes(almacenesJson || [])
        if (almacenesJson && almacenesJson.length > 0) {
          setSelectedAlmacenId(almacenesJson[0].id)
        }
        setError(null)
      })
      .catch(() => {
        setError('No se pudo cargar la información de almacenes.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedAlmacenId) {
      Promise.resolve().then(() => {
        setEstructura(null)
      })
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    fetch(`${backendBaseUrl}/api/almacenes/${selectedAlmacenId}/estructura`, {
      headers,
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar estructura')
        }
        return response.json()
      })
      .then((json) => {
        setEstructura(json || null)
        setError(null)
      })
      .catch(() => {
        setError('No se pudo cargar la estructura del almacén.')
      })
  }, [selectedAlmacenId])

  useEffect(() => {
    if (activeSection !== 'armarios-repisas') {
      return
    }
    if (repisasGlobalData !== null || isLoadingRepisasGlobal) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    Promise.resolve().then(() => {
      setIsLoadingRepisasGlobal(true)
    })
    fetch(`${backendBaseUrl}/api/almacenes/estructura-global`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar estructura global')
        return res.json()
      })
      .then((json) => {
        setRepisasGlobalData(json || [])
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingRepisasGlobal(false)
      })
  }, [activeSection, repisasGlobalData])

  useEffect(() => {
    if (!showCreateItemModal) {
      return
    }
    if (repisasGlobalData !== null || isLoadingRepisasGlobal) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    Promise.resolve().then(() => {
      setIsLoadingRepisasGlobal(true)
    })
    fetch(`${backendBaseUrl}/api/almacenes/estructura-global`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar estructura global')
        return res.json()
      })
      .then((json) => {
        setRepisasGlobalData(json || [])
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingRepisasGlobal(false)
      })
  }, [showCreateItemModal, repisasGlobalData, isLoadingRepisasGlobal])

  useEffect(() => {
    if (!showCreateItemModal) {
      return
    }
    if (!empresas || empresas.length === 0) {
      return
    }
    if (role === 'ADMIN') {
      return
    }
    if (formItemEmpresaId) {
      return
    }
    if (empresas.length === 1) {
      setFormItemEmpresaId(String(empresas[0].id))
    }
  }, [showCreateItemModal, empresas, role, formItemEmpresaId])

  useEffect(() => {
    if (activeSection !== 'inventario') {
      return
    }
    if (inventarioData !== null || isLoadingInventario) {
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
      setIsLoadingInventario(true)
    })
    fetch(`${backendBaseUrl}/api/reportes/inventario`, {
      headers,
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar inventario')
        }
        return response.json()
      })
      .then((json) => {
        setInventarioData(json || [])
        setError(null)
      })
      .catch(() => {
        setError('No se pudo cargar el inventario de almacenes.')
      })
      .finally(() => {
        setIsLoadingInventario(false)
      })
  }, [activeSection, inventarioData, isLoadingInventario])

  const handleCreateItem = () => {
    const token = localStorage.getItem('maingest-token')
    if (!token) return
    if (!formItemRepisaId || !formItemNombre || !formItemEstado || !formItemTamanio) return

    setIsSavingItem(true)
    fetch(`${backendBaseUrl}/api/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        repisaId: Number(formItemRepisaId),
        nombre: String(formItemNombre).trim(),
        estado: String(formItemEstado).trim(),
        tamanio: Number(formItemTamanio),
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Error al crear item')
        }
        return res.json()
      })
      .then(() => {
        setShowCreateItemModal(false)
        setFormItemAlmacenId('')
        setFormItemArmarioId('')
        setFormItemRepisaId('')
        setFormItemNombre('')
        setFormItemEstado('BUENO')
        setFormItemTamanio('1')
        setInventarioData(null)
      })
      .catch((err) => alert(err.message))
      .finally(() => setIsSavingItem(false))
  }

  const actualizarArmarioLocal = (armarioId, patch) => {
    setEstructura((prev) => {
      if (!prev || !prev.armarios) {
        return prev
      }
      const armarios = prev.armarios.map((armario) => {
        if (armario.id !== armarioId) {
          return armario
        }
        return { ...armario, ...patch }
      })
      return { ...prev, armarios }
    })
  }

  const clamp01 = (value) => Math.min(1, Math.max(0, value))

  const guardarPosicionArmario = (armarioId, posicion) => {
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return Promise.resolve(null)
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    return fetch(`${backendBaseUrl}/api/almacenes/armarios/${armarioId}/posicion`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(posicion),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al guardar posición')
        }
        return response.json()
      })
      .then((armarioActualizado) => {
        if (armarioActualizado && armarioActualizado.id) {
          actualizarArmarioLocal(armarioActualizado.id, armarioActualizado)
        }
        return armarioActualizado
      })
      .catch(() => null)
  }

  const ARMARIO_DISPLAY_ANCHO = 0.12
  const ARMARIO_DISPLAY_ALTO = 0.18

  const getArmarioLayout = (armario) => {
    const posX = typeof armario.posX === 'number' ? armario.posX : 0.06
    const posY = typeof armario.posY === 'number' ? armario.posY : 0.12
    const rotacion = typeof armario.rotacion === 'number' ? armario.rotacion : 0.0
    const safeAncho = Math.max(0.01, clamp01(ARMARIO_DISPLAY_ANCHO))
    const safeAlto = Math.max(0.01, clamp01(ARMARIO_DISPLAY_ALTO))
    return {
      posX: clamp01(Math.min(posX, 1 - safeAncho)),
      posY: clamp01(Math.min(posY, 1 - safeAlto)),
      ancho: safeAncho,
      alto: safeAlto,
      rotacion: rotacion
    }
  }

  const onArmarioPointerDown = (event, armario) => {
    if (!isEditMode) return
    if (!canvasRef.current) {
      return
    }
    const rect = canvasRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) {
      return
    }
    const layout = getArmarioLayout(armario)
    dragArmarioRef.current = {
      armarioId: armario.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosX: layout.posX,
      startPosY: layout.posY,
      startLayout: layout,
      ancho: layout.ancho,
      alto: layout.alto,
      containerWidth: rect.width,
      containerHeight: rect.height,
      hasMoved: false,
      actionType: 'move'
    }
    setDraggingArmarioId(armario.id)
    event.currentTarget.setPointerCapture(event.pointerId)
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
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayout: layout,
      startPosX: layout.posX, // Keep for compatibility if needed
      startPosY: layout.posY,
      ancho: layout.ancho,
      alto: layout.alto,
      containerWidth: rect.width,
      containerHeight: rect.height,
      actionType: actionType,
      hasMoved: false,
      rect: rect // Store rect for rotate calcs
    }
    setDraggingArmarioId(armario.id)
    event.target.setPointerCapture(event.pointerId)
  }

  const onArmarioPointerMove = (event) => {
    const drag = dragArmarioRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const deltaX = (event.clientX - drag.startClientX) / drag.containerWidth
    const deltaY = (event.clientY - drag.startClientY) / drag.containerHeight
    if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
        drag.hasMoved = true
    }

    if (drag.actionType === 'move') {
        const nextPosX = clamp01(Math.min(drag.startPosX + deltaX, 1 - drag.ancho))
        const nextPosY = clamp01(Math.min(drag.startPosY + deltaY, 1 - drag.alto))
        actualizarArmarioLocal(drag.armarioId, { posX: nextPosX, posY: nextPosY })
    } else if (drag.actionType === 'rotate') {
        // Center in screen coords
        const cx = drag.rect.left + (drag.startLayout.posX + drag.startLayout.ancho/2) * drag.rect.width
        const cy = drag.rect.top + (drag.startLayout.posY + drag.startLayout.alto/2) * drag.rect.height
        
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI)
        const deg = angle + 90
        actualizarArmarioLocal(drag.armarioId, { rotacion: deg })
    }
  }

  const onArmarioPointerUp = (event) => {
    const drag = dragArmarioRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    dragArmarioRef.current = null
    setDraggingArmarioId(null)
    if (!drag.hasMoved) {
        setSelectedArmarioIdForEdit(drag.armarioId)
        return
    }
    const armario = estructura?.armarios?.find((a) => a.id === drag.armarioId)
    if (!armario) {
      return
    }
    guardarPosicionArmario(drag.armarioId, {
      posX: armario.posX,
      posY: armario.posY,
      rotacion: armario.rotacion,
    })
  }

  const handleCrearAlmacen = () => {
    const empresaIdToUse = role === 'ADMIN' ? formEmpresaId : (empresas && empresas.length > 0 ? empresas[0].id : null)
    if (!formNombreAlmacen.trim() || !empresaIdToUse) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const puntosSaneados = sanitizeAlmacenShapePoints(almacenShapePoints)
    const normalizedData = normalizeShape(puntosSaneados)
    const payload = {
      nombre: formNombreAlmacen.trim(),
      empresaId: Number(empresaIdToUse),
    }
    if (normalizedData) {
      payload.estilos = JSON.stringify(normalizedData)
    } else if (puntosSaneados && puntosSaneados.length >= 3) {
      payload.estilos = JSON.stringify({ points: puntosSaneados })
    }
    Promise.resolve().then(() => {
      setIsSavingAlmacen(true)
    })
    fetch(`${backendBaseUrl}/api/almacenes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al crear almacén')
        }
        return response.json()
      })
      .then((json) => {
        setAlmacenes((prev) => {
          if (!prev) {
            return [json]
          }
          return [...prev, json]
        })
        setFormNombreAlmacen('')
        setFormEmpresaId('')
        setSelectedAlmacenId(json.id)
        setError(null)
      })
      .catch(() => {
        setError('No se pudo crear el almacén.')
      })
      .finally(() => {
        setIsSavingAlmacen(false)
      })
  }

  const openEditAlmacenModal = (almacen) => {
    if (!almacen) {
      return
    }
    setEditingAlmacen(almacen)
    setEditNombreAlmacen(almacen.nombre || '')
    setEditAlmacenShapePoints(parseAlmacenShapePointsFromEstilos(almacen.estilos))
    setShowEditAlmacenModal(true)
  }

  const closeEditAlmacenModal = () => {
    setShowEditAlmacenModal(false)
    setEditingAlmacen(null)
    setEditNombreAlmacen('')
    setEditAlmacenShapePoints(createDefaultAlmacenShape())
  }

  const handleActualizarAlmacen = () => {
    if (!editingAlmacen || !editingAlmacen.id) {
      return
    }
    const nombre = editNombreAlmacen.trim()
    if (!nombre) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const puntosSaneados = sanitizeAlmacenShapePoints(editAlmacenShapePoints)
    const normalizedData = normalizeShape(puntosSaneados)
    const payload = {
      nombre,
      estilos: normalizedData
        ? JSON.stringify(normalizedData)
        : JSON.stringify({ points: puntosSaneados }),
    }
    Promise.resolve().then(() => {
      setIsUpdatingAlmacen(true)
    })
    fetch(`${backendBaseUrl}/api/almacenes/${editingAlmacen.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al actualizar almacén')
        }
        return response.json()
      })
      .then((json) => {
        setAlmacenes((prev) => {
          if (!prev) {
            return prev
          }
          return prev.map((almacen) => (almacen.id === json.id ? json : almacen))
        })
        if (selectedAlmacenId === json.id) {
          setEstructura((prev) => {
            if (!prev) {
              return prev
            }
            return { ...prev, nombre: json.nombre, estilos: json.estilos }
          })
        }
        setError(null)
        closeEditAlmacenModal()
      })
      .catch(() => {
        setError('No se pudo actualizar el almacén.')
      })
      .finally(() => {
        setIsUpdatingAlmacen(false)
      })
  }

  const openDeleteAlmacenModal = (almacen) => {
    if (!almacen) {
      return
    }
    setAlmacenToDelete(almacen)
  }

  const closeDeleteAlmacenModal = () => {
    setAlmacenToDelete(null)
  }

  const handleEliminarAlmacen = () => {
    if (!almacenToDelete || !almacenToDelete.id) {
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
      setIsDeletingAlmacen(true)
    })
    fetch(`${backendBaseUrl}/api/almacenes/${almacenToDelete.id}`, {
      method: 'DELETE',
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al eliminar almacén')
        }
        setAlmacenes((prev) => {
          if (!prev) {
            return prev
          }
          const next = prev.filter((almacen) => almacen.id !== almacenToDelete.id)
          if (selectedAlmacenId === almacenToDelete.id) {
            const nextSelected = next.length > 0 ? next[0].id : null
            setSelectedAlmacenId(nextSelected)
          }
          return next
        })
        if (selectedAlmacenId === almacenToDelete.id) {
          setEstructura(null)
        }
        setError(null)
        closeDeleteAlmacenModal()
      })
      .catch(() => {
        setError('No se pudo eliminar el almacén.')
      })
      .finally(() => {
        setIsDeletingAlmacen(false)
      })
  }

  const handleCrearRepisa = () => {
    if (!armarioForRepisa || !formRepisaNivel || !formRepisaCapacidad) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    fetch(`${backendBaseUrl}/api/almacenes/armarios/${armarioForRepisa.id}/repisas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nivel: Number(formRepisaNivel),
        capacidad: Number(formRepisaCapacidad),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al crear repisa')
        }
        return response.json()
      })
      .then((json) => {
        setEstructura((prev) => {
          if (!prev) {
            return prev
          }
          const armarios = prev.armarios
            ? prev.armarios.map((armario) => {
                if (armario.id !== armarioForRepisa.id) {
                  return armario
                }
                const repisas = armario.repisas ? [...armario.repisas, json] : [json]
                return { ...armario, repisas }
              })
            : []
          return { ...prev, armarios }
        })
        setFormRepisaNivel('')
        setFormRepisaCapacidad('')
        setArmarioForRepisa(null)
        setError(null)
      })
      .catch(() => {
        setError('No se pudo crear la repisa.')
      })
  }

  const handleCrearArmario = () => {
    if (!formArmarioNombre.trim() || !formArmarioAlmacenId) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    Promise.resolve().then(() => {
      setIsSavingArmario(true)
    })
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const payload = {
      nombre: formArmarioNombre.trim(),
      // tamanioTotal ya es opcional en backend
      posX: 0.1,
      posY: 0.1,
      ancho: Number(formArmarioAncho) || 0.12,
      alto: Number(formArmarioAlto) || 0.6,
      rotacion: 0.0,
    }
    fetch(`${backendBaseUrl}/api/almacenes/${formArmarioAlmacenId}/armarios`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al crear armario')
        }
        return response.json()
      })
      .then(() => {
        setIsLoadingRepisasGlobal(true)
        fetch(`${backendBaseUrl}/api/almacenes/estructura-global`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
          .then((res) => res.json())
          .then((json) => {
            setRepisasGlobalData(json || [])
          })
          .catch(() => {})
          .finally(() => setIsLoadingRepisasGlobal(false))

        setShowCreateArmarioModal(false)
        setFormArmarioNombre('')
        setFormArmarioTamanio('')
        setFormArmarioAncho('0.12')
        setFormArmarioAlto('0.6')
        setFormArmarioAlmacenId('')
        setFormArmarioEmpresaId('')
        setFormArmarioMeasureMode('metros')
        setError(null)
      })
      .catch(() => {
        setError('No se pudo crear el armario.')
      })
      .finally(() => {
        setIsSavingArmario(false)
      })
  }

  const almacenesFiltrados = (() => {
    if (!almacenes) {
      return []
    }
    return almacenes.filter((almacen) => {
      const nombreOk =
        !almacenFilterNombre ||
        (almacen.nombre &&
          almacen.nombre.toLowerCase().includes(almacenFilterNombre.toLowerCase()))
      const empresaNombre = almacen.empresaNombre || ''
      const empresaOk =
        !isGlobalUser ||
        !almacenFilterEmpresa ||
        empresaNombre.toLowerCase().includes(almacenFilterEmpresa.toLowerCase())
      return nombreOk && empresaOk
    })
  })()

  const uniqueArmarios = (() => {
    if (!repisasGlobalData) return []

    const armariosMap = new Map()
    repisasGlobalData.forEach((row) => {
      if (!row.armarioId) return
      if (!armariosMap.has(row.armarioId)) {
        armariosMap.set(row.armarioId, {
          ...row,
          repisasCount: 0,
        })
      }
      if (row.repisaId) {
        armariosMap.get(row.armarioId).repisasCount += 1
      }
    })

    return Array.from(armariosMap.values())
  })()

  const armariosFiltrados = (() => {
    const empresaNeedle = isGlobalUser ? (armariosFilterEmpresa || '').trim().toLowerCase() : ''
    const almacenNeedle = (armariosFilterAlmacen || '').trim().toLowerCase()
    const armarioNeedle = (armariosFilterArmario || '').trim().toLowerCase()

    return (uniqueArmarios || []).filter((fila) => {
      const empresaLabel = (fila.empresaNombre || `Empresa #${fila.empresaId}` || '').toLowerCase()
      const almacenLabel = (fila.almacenNombre || `Almacén #${fila.almacenId}` || '').toLowerCase()
      const armarioLabel = (fila.armarioNombre || `Armario #${fila.armarioId}` || '').toLowerCase()

      const empresaOk = !empresaNeedle || empresaLabel.includes(empresaNeedle)
      const almacenOk = !almacenNeedle || almacenLabel.includes(almacenNeedle)
      const armarioOk = !armarioNeedle || armarioLabel.includes(armarioNeedle)
      return empresaOk && almacenOk && armarioOk
    })
  })()

  const visualizadorArmariosFiltrados = (() => {
    const armarios = estructura?.armarios || []
    const needle = (visualizarArmarioFilter || '').trim().toLowerCase()
    if (!needle) return armarios
    return armarios.filter((a) => (a?.nombre || '').toLowerCase().includes(needle))
  })()

  const inventarioFiltrado = (() => {
    if (!inventarioData) return []
    const empresaNeedle = isGlobalUser ? (inventarioFilterEmpresa || '').trim().toLowerCase() : ''
    const almacenNeedle = (inventarioFilterAlmacen || '').trim().toLowerCase()
    const itemNeedle = (inventarioFilterItem || '').trim().toLowerCase()
    return inventarioData.filter((fila) => {
      const empresaLabel = (fila.empresaNombre || `Empresa #${fila.empresaId}` || '').toLowerCase()
      const almacenLabel = (fila.almacenNombre || `Almacén #${fila.almacenId}` || '').toLowerCase()
      const itemLabel = (fila.itemNombre || `Item #${fila.itemId}` || '').toLowerCase()
      const empresaOk = !empresaNeedle || empresaLabel.includes(empresaNeedle)
      const almacenOk = !almacenNeedle || almacenLabel.includes(almacenNeedle)
      const itemOk = !itemNeedle || itemLabel.includes(itemNeedle)
      return empresaOk && almacenOk && itemOk
    })
  })()

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
            <div className="admin-sidebar-title">Diseño de almacenes</div>
          </div>
          <div className="admin-sidebar-nav">
            <button
              type="button"
              className={`admin-nav-item ${activeSection === 'almacenes' ? 'active' : ''}`}
              onClick={() => setActiveSection('almacenes')}
            >
              Almacenes
            </button>
            <button
              type="button"
              className={`admin-nav-item ${activeSection === 'inventario' ? 'active' : ''}`}
              onClick={() => setActiveSection('inventario')}
            >
              Inventario
            </button>
            <button
              type="button"
              className={`admin-nav-item ${
                activeSection === 'armarios-repisas' ? 'active' : ''
              }`}
              onClick={() => setActiveSection('armarios-repisas')}
            >
              Armarios y repisas
            </button>
          </div>
        </aside>
        <div className="admin-main">
          {activeSection === 'almacenes' && (
            <>
              <h2 className="admin-main-title">Almacenes</h2>
              <p className="admin-main-text">
                Gestiona los almacenes existentes, aplícales filtros y crea nuevos.
              </p>
              <div className="admin-table-shell">
                <div className="admin-table-filters">
                  <input
                    type="text"
                    placeholder="Filtrar por nombre de almacén"
                    value={almacenFilterNombre}
                    onChange={(event) => setAlmacenFilterNombre(event.target.value)}
                  />
                  {isGlobalUser ? (
                    <input
                      type="text"
                      placeholder="Filtrar por empresa"
                      value={almacenFilterEmpresa}
                      onChange={(event) => setAlmacenFilterEmpresa(event.target.value)}
                    />
                  ) : (
                    <div />
                  )}
                  <div />
                </div>
                <div className="admin-table-actions">
                  {canCreate('almacen') && (
                    <button
                      type="button"
                      className="theme-button"
                      onClick={() => {
                        setFormNombreAlmacen('')
                        setFormEmpresaId('')
                        setAlmacenShapePoints(createDefaultAlmacenShape())
                        setShowCreateAlmacenModal(true)
                      }}
                    >
                      Nuevo almacén
                    </button>
                  )}
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre del almacén</th>
                      <th>Empresa</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td>Cargando almacenes…</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {error && !isLoading && (
                      <tr>
                        <td>{error}</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!error && !isLoading && almacenesFiltrados.length === 0 && (
                      <tr>
                        <td>Aún no hay almacenes.</td>
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!error &&
                      !isLoading &&
                      almacenesFiltrados.map((almacen) => {
                        const empresaNombre = almacen.empresaNombre || `Empresa #${almacen.empresaId}`
                        const esSeleccionado = selectedAlmacenId === almacen.id
                        return (
                          <tr
                            key={almacen.id}
                            className="admin-table-row"
                            onClick={() => setSelectedAlmacenId(almacen.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setSelectedAlmacenId(almacen.id)
                              }
                            }}
                          >
                            <td>{almacen.nombre}</td>
                            <td>{empresaNombre}</td>
                            <td>{esSeleccionado ? 'Seleccionado para diseño' : 'Disponible'}</td>
                            <td>
                              <div className="acciones-buttons">
                                {canEdit('almacen') && (
                                  <button
                                    type="button"
                                    className="action-button edit-button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditAlmacenModal(almacen)
                                    }}
                                    title="Editar almacén"
                                  >
                                    ✏️ Editar
                                  </button>
                                )}
                                {canDelete('almacen') && (
                                  <button
                                    type="button"
                                    className="action-button delete-button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openDeleteAlmacenModal(almacen)
                                    }}
                                    title="Eliminar almacén"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                )}
                                {canView('almacen') && (
                                  <button
                                    type="button"
                                    className="action-button view-button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/almacen/${almacen.id}`)
                                    }}
                                    title="Ver almacén"
                                  >
                                    👁️ Ver
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {activeSection === 'inventario' && (
            <>
              <h2 className="admin-main-title">Inventario</h2>
              <p className="admin-main-text">
                Visualiza todo lo que hay dentro de los almacenes, armarios y repisas.
              </p>
              <div className="admin-table-shell">
                <div className="admin-table-filters">
                  {isGlobalUser ? (
                    <input
                      type="text"
                      placeholder="Filtrar por empresa"
                      value={inventarioFilterEmpresa}
                      onChange={(event) => setInventarioFilterEmpresa(event.target.value)}
                    />
                  ) : (
                    <div />
                  )}
                  <input
                    type="text"
                    placeholder="Filtrar por almacén"
                    value={inventarioFilterAlmacen}
                    onChange={(event) => setInventarioFilterAlmacen(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por item"
                    value={inventarioFilterItem}
                    onChange={(event) => setInventarioFilterItem(event.target.value)}
                  />
                </div>
                <div className="admin-table-actions">
                  {canCreate('item') && (
                    <button
                      type="button"
                      className="theme-button"
                      onClick={() => {
                        setShowCreateItemModal(true)
                        setFormItemEmpresaId('')
                        setFormItemAlmacenId('')
                        setFormItemArmarioId('')
                        setFormItemRepisaId('')
                        setFormItemNombre('')
                        setFormItemEstado('BUENO')
                        setFormItemTamanio('1')
                      }}
                    >
                      + Agregar inventario
                    </button>
                  )}
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Almacén</th>
                      <th>Armario / Repisa</th>
                      <th>Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingInventario && !error && (
                      <tr>
                        <td>Cargando inventario…</td>
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
                      !isLoadingInventario &&
                      inventarioFiltrado &&
                      inventarioFiltrado.map((fila) => {
                        const ubicacion = `${fila.armarioNombre || `Armario #${fila.armarioId}`} · Repisa ${
                          fila.repisaNivel
                        }`
                        const itemLabel = fila.itemNombre || `Item #${fila.itemId}`
                        const meta = []
                        if (fila.itemEstado) {
                          meta.push(fila.itemEstado)
                        }
                        if (typeof fila.itemTamanio === 'number') {
                          meta.push(`${fila.itemTamanio} u.`)
                        }
                        const metaLabel = meta.join(' · ')
                        return (
                          <tr key={`${fila.empresaId}-${fila.almacenId}-${fila.armarioId}-${fila.repisaId}-${fila.itemId}`}
                          >
                            <td>{fila.empresaNombre || `Empresa #${fila.empresaId}`}</td>
                            <td>{fila.almacenNombre || `Almacén #${fila.almacenId}`}</td>
                            <td>{ubicacion}</td>
                            <td>
                              {itemLabel}
                              {metaLabel ? ` · ${metaLabel}` : ''}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>

              {showCreateItemModal && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <h3>Agregar inventario</h3>

                    {role === 'ADMIN' && (
                      <div className="form-group">
                        <label>Empresa</label>
                        <select
                          value={formItemEmpresaId}
                          onChange={(e) => {
                            setFormItemEmpresaId(e.target.value)
                            setFormItemAlmacenId('')
                            setFormItemArmarioId('')
                            setFormItemRepisaId('')
                          }}
                        >
                          <option value="">Selecciona empresa</option>
                          {(empresas || []).map((empresa) => (
                            <option key={empresa.id} value={String(empresa.id)}>
                              {empresa.nombre || `Empresa #${empresa.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Almacén</label>
                      <select
                        value={formItemAlmacenId}
                        onChange={(e) => {
                          setFormItemAlmacenId(e.target.value)
                          setFormItemArmarioId('')
                          setFormItemRepisaId('')
                        }}
                        disabled={role === 'ADMIN' && !formItemEmpresaId}
                      >
                        <option value="">Selecciona almacén</option>
                        {(almacenes || [])
                          .filter((a) => {
                            if (role !== 'ADMIN') return true
                            return String(a.empresaId) === String(formItemEmpresaId)
                          })
                          .map((almacen) => (
                            <option key={almacen.id} value={String(almacen.id)}>
                              {almacen.nombre || `Almacén #${almacen.id}`}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Armario</label>
                      <select
                        value={formItemArmarioId}
                        onChange={(e) => {
                          setFormItemArmarioId(e.target.value)
                          setFormItemRepisaId('')
                        }}
                        disabled={!formItemAlmacenId}
                      >
                        <option value="">Selecciona armario</option>
                        {Array.from(
                          new Map(
                            (repisasGlobalData || [])
                              .filter((row) => String(row.almacenId) === String(formItemAlmacenId))
                              .filter((row) => row.armarioId)
                              .map((row) => [String(row.armarioId), row]),
                          ).values(),
                        ).map((row) => (
                          <option key={row.armarioId} value={String(row.armarioId)}>
                            {row.armarioNombre || `Armario #${row.armarioId}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Repisa</label>
                      <select
                        value={formItemRepisaId}
                        onChange={(e) => setFormItemRepisaId(e.target.value)}
                        disabled={!formItemArmarioId}
                      >
                        <option value="">Selecciona repisa</option>
                        {(repisasGlobalData || [])
                          .filter((row) => String(row.armarioId) === String(formItemArmarioId))
                          .filter((row) => row.repisaId)
                          .sort((a, b) => (Number(a.repisaNivel) || 0) - (Number(b.repisaNivel) || 0))
                          .map((row) => (
                            <option key={row.repisaId} value={String(row.repisaId)}>
                              Repisa {row.repisaNivel}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Nombre del item</label>
                      <input
                        type="text"
                        value={formItemNombre}
                        onChange={(e) => setFormItemNombre(e.target.value)}
                        placeholder="Ej. Tornillos"
                      />
                    </div>

                    <div className="form-group">
                      <label>Estado</label>
                      <select value={formItemEstado} onChange={(e) => setFormItemEstado(e.target.value)}>
                        <option value="BUENO">BUENO</option>
                        <option value="REGULAR">REGULAR</option>
                        <option value="MALO">MALO</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Tamaño</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formItemTamanio}
                        onChange={(e) => setFormItemTamanio(e.target.value)}
                      />
                    </div>

                    <div className="modal-actions">
                      <button
                        className="theme-button secondary"
                        type="button"
                        onClick={() => setShowCreateItemModal(false)}
                        disabled={isSavingItem}
                      >
                        Cancelar
                      </button>
                      <button
                        className="theme-button"
                        type="button"
                        onClick={handleCreateItem}
                        disabled={
                          isSavingItem ||
                          !formItemAlmacenId ||
                          !formItemArmarioId ||
                          !formItemRepisaId ||
                          !formItemNombre ||
                          !formItemEstado ||
                          !formItemTamanio
                        }
                      >
                        {isSavingItem ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {activeSection === 'armarios-repisas' && (
            <>
              <h2 className="admin-main-title">Armarios</h2>
              <p className="admin-main-text">
                Revisa y gestiona los armarios de todos tus almacenes.
              </p>
              <div className="admin-table-shell">
                <div className="admin-table-filters">
                  {isGlobalUser ? (
                    <input
                      type="text"
                      placeholder="Filtrar por empresa"
                      value={armariosFilterEmpresa}
                      onChange={(event) => setArmariosFilterEmpresa(event.target.value)}
                    />
                  ) : (
                    <div />
                  )}
                  <input
                    type="text"
                    placeholder="Filtrar por almacén"
                    value={armariosFilterAlmacen}
                    onChange={(event) => setArmariosFilterAlmacen(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por armario"
                    value={armariosFilterArmario}
                    onChange={(event) => setArmariosFilterArmario(event.target.value)}
                  />
                </div>
                <div className="admin-table-actions">
                  {canCreate('armario') && (
                    <button
                      type="button"
                      className="theme-button"
                      onClick={() => {
                        setFormArmarioNombre('')
                        setFormArmarioAncho('0.12')
                        setFormArmarioAlto('0.6')
                        setFormArmarioAlmacenId('')
                        setFormArmarioEmpresaId('')
                        setShowCreateArmarioModal(true)
                      }}
                    >
                      Nuevo armario
                    </button>
                  )}
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Almacén</th>
                      <th>Armario</th>
                      <th>Repisas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingRepisasGlobal && !repisasGlobalData && (
                      <tr>
                        <td>Cargando estructura…</td>
                        <td />
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {!isLoadingRepisasGlobal && repisasGlobalData && repisasGlobalData.length === 0 && (
                      <tr>
                        <td>No hay armarios registrados.</td>
                        <td />
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                    {(() => {
                      if (!armariosFiltrados) return null
                      return armariosFiltrados.map((fila, index) => (
                        <tr key={`${fila.almacenId}-${fila.armarioId}-${index}`}>
                          <td>{fila.empresaNombre}</td>
                          <td>{fila.almacenNombre}</td>
                          <td>{fila.armarioNombre}</td>
                          <td>{fila.repisasCount} repisas</td>
                          <td>
                            <div className="acciones-buttons">
                              {canView('armario') && (
                                <button
                                  type="button"
                                  className="action-button view-button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/armario/${fila.armarioId}`)
                                  }}
                                  title="Ver y editar armario visualmente"
                                >
                                  👁️ Ver / Editar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {activeSection === 'visualizar-almacen' && (
            <>
              <h2 className="admin-main-title">Visualizar Almacén</h2>
              <p className="admin-main-text">
                Visualiza el almacén con su forma y los armarios/repisas ubicados dentro.
              </p>
              <div className="admin-table-shell">
                <div className="admin-table-filters">
                  <select
                    value={selectedAlmacenId || ''}
                    onChange={(event) => {
                      const value = event.target.value
                      if (!value) {
                        setSelectedAlmacenId(null)
                        return
                      }
                      setSelectedAlmacenId(Number(value))
                    }}
                  >
                    <option value="">Selecciona un almacén</option>
                    {almacenes &&
                      almacenes.map((almacen) => (
                        <option key={almacen.id} value={almacen.id}>
                          {almacen.nombre}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Filtrar armarios por nombre"
                    value={visualizarArmarioFilter}
                    onChange={(event) => setVisualizarArmarioFilter(event.target.value)}
                  />
                  <div />
                </div>
              </div>
      {selectedAlmacenId && estructura && (
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
                    </div>
                    {selectedArmarioIdForEdit && (() => {
                        const armario = estructura?.armarios?.find(a => a.id === selectedArmarioIdForEdit)
                        if (!armario) return null
                        const layout = getArmarioLayout(armario)
                        return (
                            <div className="armario-controls-panel" style={{
                                position: 'absolute',
                                top: '60px',
                                right: '10px',
                                background: 'white',
                                padding: '10px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                zIndex: 100,
                                width: '220px',
                                border: '1px solid #ddd'
                            }}>
                                <h4 style={{margin: '0 0 10px 0', fontSize: '1rem', color: '#333'}}>Editar: {armario.nombre}</h4>
                                <div style={{marginBottom: '10px'}}>
                                    <label style={{display:'block', fontSize:'0.8rem', color: '#555', marginBottom: '4px'}}>Rotación ({Math.round(layout.rotacion)}°)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={layout.rotacion}
                                        onChange={(e) => {
                                            actualizarArmarioLocal(armario.id, { rotacion: Number(e.target.value) })
                                        }}
                                        onMouseUp={(e) => {
                                            const newRot = Number(e.target.value)
                                            guardarPosicionArmario(armario.id, { posX: armario.posX, posY: armario.posY, rotacion: newRot })
                                        }}
                                        onTouchEnd={(e) => {
                                            const newRot = Number(e.target.value)
                                            guardarPosicionArmario(armario.id, { posX: armario.posX, posY: armario.posY, rotacion: newRot })
                                        }}
                                        style={{width: '100%'}}
                                    />
                                </div>
                                <div style={{marginBottom: '10px'}}>
                                    <label style={{display:'block', fontSize:'0.8rem', color: '#555', marginBottom: '4px'}}>Ancho ({(layout.ancho * 100).toFixed(1)}%)</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        step="0.5"
                                        value={layout.ancho * 100}
                                        onChange={(e) => {
                                            actualizarArmarioLocal(armario.id, { ancho: Number(e.target.value) / 100 })
                                        }}
                                        onMouseUp={(e) => {
                                            const newAncho = Number(e.target.value) / 100
                                            guardarPosicionArmario(armario.id, { ...layout, ancho: newAncho })
                                        }}
                                         onTouchEnd={(e) => {
                                             const newAncho = Number(e.target.value) / 100
                                             guardarPosicionArmario(armario.id, { ...layout, ancho: newAncho })
                                        }}
                                        style={{width: '100%'}}
                                    />
                                </div>
                                <div style={{marginBottom: '10px'}}>
                                    <label style={{display:'block', fontSize:'0.8rem', color: '#555', marginBottom: '4px'}}>Alto ({(layout.alto * 100).toFixed(1)}%)</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        step="0.5"
                                        value={layout.alto * 100}
                                        onChange={(e) => {
                                            actualizarArmarioLocal(armario.id, { alto: Number(e.target.value) / 100 })
                                        }}
                                        onMouseUp={(e) => {
                                            const newAlto = Number(e.target.value) / 100
                                            guardarPosicionArmario(armario.id, { ...layout, alto: newAlto })
                                        }}
                                         onTouchEnd={(e) => {
                                             const newAlto = Number(e.target.value) / 100
                                             guardarPosicionArmario(armario.id, { ...layout, alto: newAlto })
                                        }}
                                        style={{width: '100%'}}
                                    />
                                </div>
                                <button
                                    className="theme-button"
                                    style={{width: '100%', fontSize: '0.8rem', padding: '4px'}}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedArmarioIdForEdit(null)
                                    }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        )
                    })()}
                    <div className="almacen-zoom-scroll">
                      <div
                        className="almacen-canvas"
                        ref={canvasRef}
                        style={zoomedCanvasStyle}
                        onClick={() => setSelectedArmarioIdForEdit(null)}
                      >
                        <div className="almacen-shape-layer">
                          {renderAlmacenShape(almacenes.find((a) => a.id === selectedAlmacenId)?.estilos) || (
                            <div className="almacen-shape-placeholder">
                              <p>Forma del almacén no disponible</p>
                            </div>
                          )}
                        </div>
                        <div className="almacen-armarios-layer">
                          {visualizadorArmariosFiltrados &&
                            visualizadorArmariosFiltrados.map((armario) => {
                              const layout = getArmarioLayout(armario)
                              return (
                                <div
                                  key={armario.id}
                                  className={`armario-box ${
                                    draggingArmarioId === armario.id ? 'dragging' : ''
                                  }`}
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
                                  onPointerDown={(event) => onArmarioPointerDown(event, armario)}
                                  onPointerMove={onArmarioPointerMove}
                                  onPointerUp={onArmarioPointerUp}
                                  onPointerCancel={onArmarioPointerUp}
                                  onClick={(e) => e.stopPropagation()}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <span className="armario-box-label" style={{ transform: `rotate(-${layout.rotacion}deg)` }}>{armario.nombre}</span>
                                  {isEditMode && selectedArmarioIdForEdit === armario.id && (
                                    <>
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
                    <h3>Armarios y repisas</h3>
                    {visualizadorArmariosFiltrados && visualizadorArmariosFiltrados.length > 0 ? (
                      visualizadorArmariosFiltrados.map(armario => (
                        <div key={armario.id} className="armario-item">
                          <h4>{armario.nombre}</h4>
                          {armario.repisas && armario.repisas.length > 0 ? (
                            <ul className="repisas-list">
                              {armario.repisas.map(repisa => (
                                <li key={repisa.id} className="repisa-item">
                                  <span>Repisa {repisa.nivel}</span>
                                  <span className="repisa-capacidad">
                                    Capacidad: {repisa.capacidad}
                                  </span>
                                  {repisa.items && repisa.items.length > 0 && (
                                    <span className="repisa-ocupacion">
                                      Ocupación: {repisa.items.length} items
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="no-repisas">Sin repisas</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="no-armarios">No hay armarios en este almacén</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showCreateAlmacenModal && (
        <div className="modal-backdrop">
          <div className="modal modal-large">
            <h3 className="modal-title">Nuevo almacén</h3>
            <p className="modal-text">
              Define el nombre y la empresa a la que pertenece el almacén.
            </p>
            <div className="modal-form">
              <input
                type="text"
                placeholder="Nombre del almacén"
                value={formNombreAlmacen}
                onChange={(event) => setFormNombreAlmacen(event.target.value)}
              />
              {role === 'ADMIN' ? (
                <select
                  value={formEmpresaId}
                  onChange={(event) => setFormEmpresaId(event.target.value)}
                >
                  <option value="">Selecciona empresa</option>
                  {empresas &&
                    empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </option>
                    ))}
                </select>
              ) : (
                <div className="form-static-field">
                  <label className="field-label">Empresa</label>
                  <span className="field-value">
                    {empresas && empresas.length > 0 ? empresas[0].nombre : 'Tu empresa'}
                  </span>
                </div>
              )}
            </div>
            <AlmacenShapeEditor value={almacenShapePoints} onChange={setAlmacenShapePoints} />
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setShowCreateAlmacenModal(false)
                  setFormNombreAlmacen('')
                  setFormEmpresaId('')
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                disabled={isSavingAlmacen}
                onClick={() => {
                  handleCrearAlmacen()
                  setShowCreateAlmacenModal(false)
                }}
              >
                {isSavingAlmacen ? 'Creando…' : 'Crear almacén'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditAlmacenModal && editingAlmacen && (
        <div className="modal-backdrop">
          <div className="modal modal-large">
            <h3 className="modal-title">Editar almacén</h3>
            <p className="modal-text">Actualiza el nombre y la forma del almacén seleccionado.</p>
            <div className="modal-form">
              <input
                type="text"
                placeholder="Nombre del almacén"
                value={editNombreAlmacen}
                onChange={(event) => setEditNombreAlmacen(event.target.value)}
              />
            </div>
            <AlmacenShapeEditor value={editAlmacenShapePoints} onChange={setEditAlmacenShapePoints} />
            <div className="modal-actions">
              <button type="button" className="theme-button" onClick={closeEditAlmacenModal}>
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                disabled={isUpdatingAlmacen || !editNombreAlmacen.trim()}
                onClick={handleActualizarAlmacen}
              >
                {isUpdatingAlmacen ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {almacenToDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Eliminar almacén</h3>
            <p className="modal-text">
              ¿Seguro que quieres eliminar el almacén "{almacenToDelete.nombre}"? Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={closeDeleteAlmacenModal}
                disabled={isDeletingAlmacen}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                onClick={handleEliminarAlmacen}
                disabled={isDeletingAlmacen}
              >
                {isDeletingAlmacen ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {armarioForRepisa && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Nueva repisa</h3>
            <p className="modal-text">
              Define el piso y la capacidad de la repisa en el armario seleccionado.
            </p>
            <div className="modal-form">
              <input
                type="number"
                min="1"
                placeholder="Nivel / piso"
                value={formRepisaNivel}
                onChange={(event) => setFormRepisaNivel(event.target.value)}
              />
              <input
                type="number"
                min="1"
                placeholder="Capacidad"
                value={formRepisaCapacidad}
                onChange={(event) => setFormRepisaCapacidad(event.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setArmarioForRepisa(null)
                  setFormRepisaNivel('')
                  setFormRepisaCapacidad('')
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                onClick={handleCrearRepisa}
              >
                Crear repisa
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreateArmarioModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Nuevo armario</h3>
            <p className="modal-text">Crea un armario dentro de un almacén.</p>
            <div className="modal-form">
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="theme-button secondary"
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  onClick={() =>
                    setFormArmarioMeasureMode((prev) => (prev === 'metros' ? 'proporcion' : 'metros'))
                  }
                  title="Cambiar tipo de medida"
                >
                  {formArmarioMeasureMode === 'metros' ? 'Metros' : 'Proporción'}
                </button>
              </div>

              {role === 'ADMIN' ? (
                <select
                  value={formArmarioEmpresaId}
                  onChange={(e) => {
                    setFormArmarioEmpresaId(e.target.value)
                    setFormArmarioAlmacenId('')
                  }}
                >
                  <option value="">Selecciona empresa</option>
                  {empresas &&
                    empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </option>
                    ))}
                </select>
              ) : null}
              <select
                value={formArmarioAlmacenId}
                onChange={(e) => setFormArmarioAlmacenId(e.target.value)}
                disabled={role === 'ADMIN' && !formArmarioEmpresaId}
              >
                <option value="">Selecciona almacén</option>
                {almacenes &&
                  almacenes
                    .filter((almacen) => {
                      if (role === 'ADMIN') {
                        return String(almacen.empresaId) === String(formArmarioEmpresaId)
                      }
                      return true
                    })
                    .map((almacen) => (
                      <option key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </option>
                    ))}
              </select>
              <input
                type="text"
                placeholder="Nombre del armario"
                value={formArmarioNombre}
                onChange={(e) => setFormArmarioNombre(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
                      {`Ancho (${formArmarioMeasureMode === 'metros' ? 'Metros' : 'Proporción'})`}
                    </label>
                    <input
                        type="number"
                        min={formArmarioMeasureMode === 'metros' ? '0.01' : '0.01'}
                        max="1"
                        step={formArmarioMeasureMode === 'metros' ? '1' : '0.01'}
                        placeholder="Ancho"
                        value={formArmarioAncho}
                        onChange={(e) => setFormArmarioAncho(e.target.value)}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
                      {`Alto (${formArmarioMeasureMode === 'metros' ? 'Metros' : 'Proporción'})`}
                    </label>
                    <input
                        type="number"
                        min={formArmarioMeasureMode === 'metros' ? '0.01' : '0.01'}
                        max="1"
                        step={formArmarioMeasureMode === 'metros' ? '1' : '0.01'}
                        placeholder="Alto"
                        value={formArmarioAlto}
                        onChange={(e) => setFormArmarioAlto(e.target.value)}
                    />
                </div>
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                {formArmarioMeasureMode === 'metros'
                  ? 'Metros: 1 = 1 metro (máximo 1m).'
                  : 'Proporción: 0 a 1.'}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setShowCreateArmarioModal(false)
                  setFormArmarioAncho('0.12')
                  setFormArmarioAlto('0.6')
                  setFormArmarioMeasureMode('metros')
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="theme-button"
                disabled={
                  isSavingArmario ||
                  !formArmarioNombre.trim() ||
                  !formArmarioAlmacenId
                }
                onClick={handleCrearArmario}
              >
                {isSavingArmario ? 'Creando…' : 'Crear armario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default AlmacenesPage
