import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const UserMenu = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  
  const name = user?.nombre || localStorage.getItem('maingest-user-name') || ''
  const email = user?.correo || localStorage.getItem('maingest-user-email') || ''
  const photo = user?.foto || localStorage.getItem('maingest-user-photo') || ''

  const displayName = name || email || 'Usuario'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="user-menu">
      <button
        type="button"
        className="user-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="user-avatar">
          {photo ? <img src={photo} alt={displayName} /> : <span>{initials || 'U'}</span>}
        </div>
        <div className="user-meta">
          <span className="user-name">{displayName}</span>
          {email && <span className="user-email">{email}</span>}
        </div>
        <span className="user-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="user-dropdown">
          <button type="button" className="user-dropdown-item" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
