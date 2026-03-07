import React, { useEffect, useRef, useState } from 'react'

const themeOptions = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'semi', label: 'Semi' },
]

const ThemeSelector = ({ theme, onChange, onThemeChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef(null)
  const handleThemeChange = onChange || onThemeChange

  useEffect(() => {
    if (!mobileOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMobileOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [mobileOpen])

  return (
    <div className="theme-row">
      <span className="theme-label">Tema</span>
      <div className="theme-buttons">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`theme-button ${theme === option.value ? 'active' : ''}`}
            onClick={() => handleThemeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="theme-dropdown-mobile" ref={dropdownRef}>
        <button
          type="button"
          className={`theme-dropdown-trigger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-label="Seleccionar tema"
        >
          {themeOptions.find((option) => option.value === theme)?.label || 'Tema'}
        </button>
        {mobileOpen && (
          <div className="theme-dropdown-menu">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`theme-dropdown-item ${theme === option.value ? 'active' : ''}`}
                onClick={() => {
                  handleThemeChange(option.value)
                  setMobileOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ThemeSelector
