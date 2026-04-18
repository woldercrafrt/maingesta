import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MobileNavMenu from '../components/MobileNavMenu'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import LocalNavBar from '../components/LocalNavBar'
import { useAuth } from '../context/AuthContext'
import { backendBaseUrl } from '../utils/config'

const HomePage = ({ theme, onThemeChange }) => {
  const navigate = useNavigate()
  const { role, canView, token, user, logout } = useAuth()

  useEffect(() => {
    if (!token || !user || !user.id) {
      return
    }
    if (role === 'ADMIN') {
      return
    }

    const headers = { Authorization: `Bearer ${token}` }
    fetch(`${backendBaseUrl}/api/usuarios/${user.id}/empresas`, { headers })
      .then((r) => {
        if (r.status === 401) {
          logout()
          throw new Error('UNAUTHORIZED')
        }
        if (!r.ok) {
          throw new Error('ERROR')
        }
        return r.json()
      })
      .then((lista) => {
        if (Array.isArray(lista) && lista.length === 0) {
          navigate('/crear-empresa', { replace: true })
        }
      })
      .catch(() => {})
  }, [token, user, role, navigate, logout])
  
  // Determinar qué botones mostrar
  // ADMIN_EMPRESA ve todo lo de su empresa por defecto
  // Los permisos granulares controlan acciones dentro de cada módulo, no la visibilidad
  const isAdmin = role === 'ADMIN'
  const isAdminEmpresa = role === 'ADMIN_EMPRESA'
  const isAdminAlmacen = role === 'ADMIN_ALMACEN'
  
  const showAdmin = isAdmin
  const showUsuariosRoles = isAdmin || isAdminEmpresa || canView('usuario')
  const showEmpresa = isAdminEmpresa
  const showAlmacenes = isAdmin || isAdminEmpresa || isAdminAlmacen || canView('almacen')
  const showCatalogo = isAdmin || isAdminEmpresa || canView('producto') || canView('item')
  const showKardex = isAdmin || isAdminEmpresa || isAdminAlmacen || canView('movimiento') || canView('kardex')
  const showSuscripcion = isAdminEmpresa
  
  return (
    <main className="page">
      <section className="card card-wide">
        <header className="header">
          <div>
            <h1 className="title">Home</h1>
            <p className="subtitle">Accesos rápidos</p>
          </div>
          <div className="header-right">
            <MobileNavMenu />
            <ThemeSelector theme={theme} onChange={onThemeChange} />
            <UserMenu />
          </div>
        </header>

        <LocalNavBar />
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
          {showAdmin && (
            <Link to="/admin" className="card-button">
              <span className="card-title">Administrador</span>
              <span className="card-text">
                Accede al panel principal para configurar el sistema y ver métricas.
              </span>
            </Link>
          )}
          {showUsuariosRoles && (
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
                  Administra cuentas, roles y permisos del equipo.
                </span>
              </div>
            </Link>
          )}
          {showEmpresa && (
            <Link to="/empresa" className="card-button">
              <span className="card-title">Mi Empresa</span>
              <span className="card-text">
                Gestiona la información, usuarios y configuración de tu empresa.
              </span>
            </Link>
          )}
          {showAlmacenes && (
            <Link to="/almacenes" className="card-button">
              <span className="card-title">Almacenes</span>
              <span className="card-text">
                Consulta los almacenes creados y su inventario por armario y repisa.
              </span>
            </Link>
          )}
          {showCatalogo && (
            <Link to="/catalogo" className="card-button">
              <span className="card-title">Catálogo</span>
              <span className="card-text">
                Gestiona el catálogo central de productos de tu empresa.
              </span>
            </Link>
          )}
          {showKardex && (
            <Link to="/kardex" className="card-button">
              <span className="card-title">Kárdex</span>
              <span className="card-text">
                Consulta y registra los movimientos de entrada, salida y traslado.
              </span>
            </Link>
          )}
          {showSuscripcion && (
            <Link to="/suscripcion" className="card-button">
              <span className="card-title">Suscripción</span>
              <span className="card-text">
                Consulta tu plan actual y contrata nuevas suscripciones para tu empresa.
              </span>
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}

export default HomePage
