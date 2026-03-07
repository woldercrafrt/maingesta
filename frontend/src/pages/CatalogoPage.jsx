import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileNavMenu from '../components/MobileNavMenu'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import { useAuth } from '../context/AuthContext'
import { backendBaseUrl } from '../utils/config'

const CatalogoPage = ({ theme, onThemeChange }) => {
  const navigate = useNavigate()
  const { token, canView, canCreate, canEdit, canDelete } = useAuth()
  const [empresas, setEmpresas] = useState([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [productos, setProductos] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingProducto, setEditingProducto] = useState(null)
  const [form, setForm] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    precioBase: '',
    unidadMedida: 'UNIDAD',
    activo: true
  })

  const loadEmpresas = useCallback(async () => {
    try {
      const res = await fetch(`${backendBaseUrl}/api/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Error al cargar empresas')
      const data = await res.json()
      setEmpresas(data)
      if (data.length > 0) {
        setSelectedEmpresaId(data[0].id.toString())
      }
    } catch (err) {
      setError(err.message)
    }
  }, [token])

  const loadProductos = useCallback(async () => {
    if (!selectedEmpresaId) return
    setIsLoading(true)
    setError(null)
    try {
      const q = query ? `&query=${encodeURIComponent(query)}` : ''
      const res = await fetch(`${backendBaseUrl}/api/productos?empresaId=${selectedEmpresaId}&page=${page}&size=20${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Error al cargar productos')
      const data = await res.json()
      setProductos(data.content || [])
      setTotalPages(data.totalPages || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedEmpresaId, page, query])

  useEffect(() => {
    loadEmpresas()
  }, [loadEmpresas])

  useEffect(() => {
    loadProductos()
  }, [loadProductos])

  const handleOpenModal = (producto = null) => {
    if (producto) {
      setEditingProducto(producto)
      setForm({
        sku: producto.sku || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precioBase: producto.precioBase || '',
        unidadMedida: producto.unidadMedida || 'UNIDAD',
        activo: producto.activo
      })
    } else {
      setEditingProducto(null)
      setForm({
        sku: '',
        nombre: '',
        descripcion: '',
        precioBase: '',
        unidadMedida: 'UNIDAD',
        activo: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProducto(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    try {
      const url = editingProducto 
        ? `${backendBaseUrl}/api/productos/${editingProducto.id}`
        : `${backendBaseUrl}/api/productos`
        
      const method = editingProducto ? 'PUT' : 'POST'
      
      const payload = editingProducto ? {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precioBase: form.precioBase ? parseFloat(form.precioBase) : null,
        unidadMedida: form.unidadMedida,
        activo: form.activo
      } : {
        empresaId: parseInt(selectedEmpresaId),
        sku: form.sku,
        nombre: form.nombre,
        descripcion: form.descripcion,
        precioBase: form.precioBase ? parseFloat(form.precioBase) : null,
        unidadMedida: form.unidadMedida
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        if (res.status === 409) throw new Error('Ya existe un producto con ese SKU')
        throw new Error('Error al guardar el producto')
      }

      handleCloseModal()
      loadProductos()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este producto?')) return
    try {
      const res = await fetch(`${backendBaseUrl}/api/productos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Error al eliminar')
      loadProductos()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!canView('PRODUCTO', 1)) {
    return (
      <div className="page" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No tienes permiso para ver el catálogo</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/home')}>Volver</button>
      </div>
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
          <MobileNavMenu />
          <ThemeSelector theme={theme} onThemeChange={onThemeChange} />
          <UserMenu />
        </div>
      </header>

      <div className="admin-body admin-body-single">
        <div className="admin-main">
          <h2 className="admin-main-title">Catálogo de productos</h2>
          <p className="admin-main-text">
            Gestiona el catálogo central de productos de tu empresa, sus datos base y su estado.
          </p>

          <div className="admin-table-shell">
          <div className="admin-table-filters">
            <select 
              value={selectedEmpresaId} 
              onChange={(e) => { setSelectedEmpresaId(e.target.value); setPage(0); }}
            >
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>

            <input 
              type="text" 
              placeholder="Buscar por SKU o nombre" 
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            />

            <div />
          </div>

          <div className="admin-table-actions">
            {canCreate('PRODUCTO', 2) && (
              <button type="button" className="theme-button" onClick={() => handleOpenModal()}>
                Nuevo producto
              </button>
            )}
          </div>

          {error && <p className="admin-main-text" style={{ color: '#b91c1c', padding: '0 14px 8px' }}>{error}</p>}

          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Unidad</th>
                <th>Precio Base</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6">Cargando...</td></tr>
              ) : productos.length === 0 ? (
                <tr><td colSpan="6">No hay productos</td></tr>
              ) : (
                productos.map(p => (
                  <tr key={p.id}>
                    <td>{p.sku}</td>
                    <td>
                      <div><strong>{p.nombre}</strong></div>
                      {p.descripcion && <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>{p.descripcion}</div>}
                    </td>
                    <td>{p.unidadMedida}</td>
                    <td>{p.precioBase ? `$${p.precioBase.toFixed(2)}` : '-'}</td>
                    <td>
                      <span style={{ color: p.activo ? 'green' : 'red' }}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-buttons">
                        {canEdit('PRODUCTO', 3) && (
                          <button type="button" className="action-button edit-button" onClick={() => handleOpenModal(p)}>✏️ Editar</button>
                        )}
                        {canDelete('PRODUCTO', 4) && (
                          <button type="button" className="action-button delete-button" onClick={() => handleDelete(p.id)}>🗑️ Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            <button 
              className="theme-button" 
              disabled={page === 0} 
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <span style={{ padding: '0.5rem' }}>Página {page + 1} de {totalPages}</span>
            <button 
              className="theme-button" 
              disabled={page >= totalPages - 1} 
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              Siguiente
            </button>
          </div>
        )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingProducto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              {!editingProducto && (
                <div className="form-group">
                  <label>SKU (Opcional - Autogenerado si se deja vacío)</label>
                  <input
                    type="text"
                    className="input"
                    value={form.sku}
                    onChange={e => setForm({...form, sku: e.target.value})}
                    maxLength={50}
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="input"
                  value={form.descripcion}
                  onChange={e => setForm({...form, descripcion: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Precio Base</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={form.precioBase}
                  onChange={e => setForm({...form, precioBase: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Unidad de Medida</label>
                <select
                  className="input"
                  value={form.unidadMedida}
                  onChange={e => setForm({...form, unidadMedida: e.target.value})}
                >
                  <option value="UNIDAD">Unidad</option>
                  <option value="KG">Kilogramo (kg)</option>
                  <option value="LITRO">Litro (L)</option>
                  <option value="METRO">Metro (m)</option>
                  <option value="CAJA">Caja</option>
                  <option value="PAQUETE">Paquete</option>
                </select>
              </div>

              {editingProducto && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="activo"
                    checked={form.activo}
                    onChange={e => setForm({...form, activo: e.target.checked})}
                  />
                  <label htmlFor="activo" style={{ margin: 0 }}>Producto Activo</label>
                </div>
              )}

              <div className="modal-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default CatalogoPage
