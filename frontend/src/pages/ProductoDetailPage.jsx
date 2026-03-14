import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MobileNavMenu from '../components/MobileNavMenu'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import LocalNavBar from '../components/LocalNavBar'
import { useAuth } from '../context/AuthContext'
import { backendBaseUrl } from '../utils/config'

const ProductoDetailPage = ({ theme, onThemeChange }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, canView } = useAuth()
  const [producto, setProducto] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    if (!canView('PRODUCTO', 1)) {
      setError('No tienes permiso para ver este producto')
      setIsLoading(false)
      return
    }

    const loadProducto = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`${backendBaseUrl}/api/productos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          throw new Error('No se pudo cargar el producto')
        }
        const data = await res.json()
        setProducto(data)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadProducto()
  }, [id, token, canView, navigate])

  if (isLoading) {
    return (
      <div className="page loading-container">
        <div className="loading-spinner" />
        <p>Cargando producto...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page error-container" style={{ textAlign: 'center', padding: '2rem' }}>
        <p className="error-message">{error}</p>
        <button className="theme-button" type="button" onClick={() => navigate('/catalogo')}>
          Volver al catálogo
        </button>
      </div>
    )
  }

  if (!producto) {
    return null
  }

  const precioTexto = producto.precioBase != null ? `$${Number(producto.precioBase).toFixed(2)}` : '-'

  return (
    <main className="page admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-topbar-mark" />
          <span className="admin-topbar-title">Detalle de producto</span>
        </div>
        <div className="admin-header-right">
          <MobileNavMenu />
          <ThemeSelector theme={theme} onThemeChange={onThemeChange} />
          <UserMenu />
        </div>
      </header>

      <div className="admin-body admin-body-single">
        <div className="admin-main">
          <LocalNavBar />

          <h2 className="admin-main-title">{producto.nombre}</h2>
          <p className="admin-main-text">Detalle completo del producto en el catálogo central.</p>

          <div className="admin-table-shell" style={{ marginTop: '12px' }}>
            <div style={{ padding: '12px 16px', display: 'grid', gap: '10px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>SKU</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{producto.sku || 'Sin SKU'}</div>

              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>Nombre</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{producto.nombre}</div>

              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>Descripción</div>
              <div style={{ fontSize: '14px' }}>{producto.descripcion || 'Sin descripción'}</div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Precio base</div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{precioTexto}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Unidad de medida</div>
                  <div style={{ fontSize: '13px' }}>{producto.unidadMedida}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Estado</div>
                  <div style={{ fontSize: '13px', color: producto.activo ? 'green' : 'red' }}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProductoDetailPage
