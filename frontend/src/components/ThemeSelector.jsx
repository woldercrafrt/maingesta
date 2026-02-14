import React from 'react'

const themeOptions = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'semi', label: 'Semi' },
]

const ThemeSelector = ({ theme, onChange }) => {
  return (
    <div className="theme-row">
      <span className="theme-label">Tema</span>
      <div className="theme-buttons">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`theme-button ${theme === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ThemeSelector
