import React from 'react'
import { Link } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'

const HomePage = ({ theme, onThemeChange }) => {
  const role = localStorage.getItem('maingest-role') || ''
  return (
    <main className="page">
      <section className="card card-wide">
        <header className="header">
          <div>
            <h1 className="title">Home</h1>
            <p className="subtitle">Accesos rápidos</p>
          </div>
          <div className="header-right">
            <ThemeSelector theme={theme} onChange={onThemeChange} />
            <UserMenu />
          </div>
        </header>
        <div className="home-hero">
          <div className="home-hero-graphic">
            <span className="home-hero-block" />
            <span className="home-hero-block" />
            <span className="home-hero-block" />
          </div>
          <div className="home-hero-copy">
            <h2 className="home-hero-title">Organiza tus almacenes</h2>
            <p className="home-hero-text">
              Visualiza de un vistazo los accesos clave para administrar tu operación.
            </p>
          </div>
        </div>
        <div className="grid grid-cards">
          {(role === 'ADMIN' || role === 'ADMIN_EMPRESA') && (
            <>
              {role === 'ADMIN' && (
                <Link to="/admin" className="card-button">
                  <span className="card-title">Administrador</span>
                  <span className="card-text">
                    Accede al panel principal para configurar el sistema y ver métricas.
                  </span>
                </Link>
              )}
              <Link to="/usuarios-roles" className="card-button card-button-users">
                <div className="card-users-header">
                  <div className="card-users-avatars">
                    <span className="card-users-avatar" />
                    <span className="card-users-avatar" />
                    <span className="card-users-avatar" />
                  </div>
                  <span className="card-users-badge">Usuarios y roles</span>
                </div>
                <div className="card-users-body">
                  <span className="card-title">Gestionar usuarios</span>
                  <span className="card-text">
                    Administra cuentas, roles globales y permisos detallados del equipo.
                  </span>
                </div>
              </Link>
            </>
          )}
          <Link to="/almacenes" className="card-button">
            <span className="card-title">Almacenes</span>
            <span className="card-text">
              Consulta los almacenes creados y su inventario por armario y repisa.
            </span>
          </Link>
        </div>
      </section>
    </main>
  )
}

export default HomePage
