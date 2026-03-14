import React from 'react'
import { useNavigate } from 'react-router-dom'

const LocalNavBar = ({ showBack = true, showHome = true, className = '', style = {} }) => {
  const navigate = useNavigate()

  if (!showBack && !showHome) {
    return null
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
        marginBottom: '8px',
        ...style
      }}
    >
      {showBack && (
        <button
          type="button"
          className="theme-button secondary"
          onClick={() => navigate(-1)}
        >
          
          
          
          
          
          ← Volver
        </button>
      )}
      {showHome && (
        <button
          type="button"
          className="theme-button"
          onClick={() => navigate('/home')}
        >
          🏠 Home
        </button>
      )}
    </div>
  )
}

export default LocalNavBar
