import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const MobileNavMenu = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const role = localStorage.getItem('maingest-role') || ''

  const items = useMemo(() => {
    const baseItems = [
      { label: 'Home', path: '/home' },
      { label: 'Almacenes', path: '/almacenes' },
      { label: 'Catálogo', path: '/catalogo' },
      { label: 'Kárdex', path: '/kardex' },
    ]

    if (role === 'ADMIN') {
      baseItems.splice(1, 0, { label: 'Administrador', path: '/admin' })
      baseItems.splice(2, 0, { label: 'Usuarios y roles', path: '/usuarios-roles' })
      baseItems.push({ label: 'Empresa', path: '/empresa' })
    }

    if (role === 'ADMIN_EMPRESA') {
      baseItems.splice(1, 0, { label: 'Usuarios y roles', path: '/usuarios-roles' })
      baseItems.push({ label: 'Empresa', path: '/empresa' })
      baseItems.push({ label: 'Suscripción', path: '/suscripcion' })
    }

    if (role !== 'ADMIN') {
      baseItems.push({ label: 'Suscripción', path: '/suscripcion' })
    }

    const seen = new Set()
    return baseItems.filter((item) => {
      if (seen.has(item.path)) {
        return false
      }
      seen.add(item.path)
      return true
    })
  }, [role])

  const activeItem = items.find((item) => location.pathname.startsWith(item.path)) || items[0]

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (!items.length) {
    return null
  }

  return (
    <div className="mobile-nav-menu" ref={menuRef}>
      <button
        type="button"
        className={`mobile-nav-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Abrir navegación"
      >
        <span>{activeItem?.label || 'Navegación'}</span>
      </button>
      {open && (
        <div className="mobile-nav-dropdown-menu">
          {items.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`mobile-nav-dropdown-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path)
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MobileNavMenu
