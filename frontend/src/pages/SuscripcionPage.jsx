import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import { backendBaseUrl } from '../utils/config'

const SuscripcionPage = ({ theme, onThemeChange }) => {
  const [planes, setPlanes] = useState(null)
  const [suscripcionActual, setSuscripcionActual] = useState(null)
  const [empresaId, setEmpresaId] = useState(null)
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [duracionMeses, setDuracionMeses] = useState('1')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    const headers = { Authorization: `Bearer ${token}` }

    fetch(`${backendBaseUrl}/api/empresas`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((empresas) => {
        if (empresas && empresas.length > 0) {
          const emp = empresas[0]
          setEmpresaId(emp.id)
          setEmpresaNombre(emp.nombre)

          fetch(`${backendBaseUrl}/api/empresas/${emp.id}/suscripcion`, { headers })
            .then((r) => {
              if (r.status === 204) return null
              if (!r.ok) return null
              return r.json()
            })
            .then((data) => {
              setSuscripcionActual(data)
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        setError('No se pudo cargar la información de la empresa.')
      })
      .finally(() => {
        setIsLoading(false)
      })

    fetch(`${backendBaseUrl}/api/empresas/planes-disponibles`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setPlanes(data || [])
      })
      .catch(() => {
        setError('No se pudo cargar los planes disponibles.')
      })
  }, [])

  const handleComprar = () => {
    if (!empresaId || !selectedPlanId) {
      return
    }
    const token = localStorage.getItem('maingest-token')
    if (!token) {
      return
    }
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    const hoy = new Date()
    const fechaInicio = hoy.toISOString().split('T')[0]
    const meses = Number(duracionMeses) || 1
    const fin = new Date(hoy)
    fin.setMonth(fin.getMonth() + meses)
    const fechaFin = fin.toISOString().split('T')[0]

    fetch(`${backendBaseUrl}/api/empresas/${empresaId}/suscripciones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId: Number(selectedPlanId),
        fechaInicio,
        fechaFin,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al contratar suscripción')
        }
        return response.json()
      })
      .then((data) => {
        setSuscripcionActual(data)
        setSuccess('Suscripción contratada correctamente.')
        setSelectedPlanId('')
      })
      .catch(() => {
        setError('No se pudo contratar la suscripción. Inténtalo de nuevo.')
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  const planSeleccionado =
    planes && selectedPlanId
      ? planes.find((p) => p.id === Number(selectedPlanId))
      : null

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
          <UserMenu />
        </div>
      </header>
      <div className="admin-body">
        <div className="admin-main" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
          <h2 className="admin-main-title">Suscripción</h2>
          <p className="admin-main-text">
            {empresaNombre
              ? `Gestiona la suscripción de "${empresaNombre}".`
              : 'Gestiona la suscripción de tu empresa.'}
          </p>

          {error && (
            <div style={{ color: 'var(--color-error, #e53935)', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: 'var(--color-success, #43a047)', marginBottom: '1rem' }}>
              {success}
            </div>
          )}

          {isLoading && <p>Cargando…</p>}

          {!isLoading && suscripcionActual && (
            <div className="admin-table-shell" style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Plan actual</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Días restantes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{suscripcionActual.planNombre}</td>
                    <td>{suscripcionActual.fechaInicio}</td>
                    <td>{suscripcionActual.fechaFin || '∞'}</td>
                    <td>
                      {suscripcionActual.fechaFin
                        ? `${suscripcionActual.diasRestantes} días`
                        : 'Sin fecha fin'}
                    </td>
                    <td>
                      <span style={{
                        color: suscripcionActual.estado === 'ACTIVA'
                          ? 'var(--color-success, #43a047)'
                          : 'var(--color-error, #e53935)',
                      }}>
                        {suscripcionActual.estado}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              {suscripcionActual.plan && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.9em', opacity: 0.7 }}>
                  Límites del plan:{' '}
                  {[
                    suscripcionActual.plan.limiteAlmacenes != null && `${suscripcionActual.plan.limiteAlmacenes} almacenes`,
                    suscripcionActual.plan.limiteArmarios != null && `${suscripcionActual.plan.limiteArmarios} armarios`,
                    suscripcionActual.plan.limiteRepisas != null && `${suscripcionActual.plan.limiteRepisas} repisas`,
                    suscripcionActual.plan.limiteItems != null && `${suscripcionActual.plan.limiteItems} items`,
                    suscripcionActual.plan.limiteUsuarios != null && `${suscripcionActual.plan.limiteUsuarios} usuarios`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Ilimitado'}
                </div>
              )}
            </div>
          )}

          {!isLoading && !suscripcionActual && (
            <div style={{ marginBottom: '2rem', opacity: 0.7 }}>
              Tu empresa no tiene una suscripción activa.
            </div>
          )}

          {!isLoading && planes && planes.length > 0 && (
            <div className="admin-table-shell">
              <h3 style={{ margin: '0 0 1rem 0' }}>
                {suscripcionActual ? 'Cambiar plan' : 'Contratar un plan'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {planes.map((plan) => {
                  const isSelected = selectedPlanId === String(plan.id)
                  const limites = []
                  if (plan.limiteAlmacenes != null) limites.push(`${plan.limiteAlmacenes} almacenes`)
                  if (plan.limiteArmarios != null) limites.push(`${plan.limiteArmarios} armarios`)
                  if (plan.limiteRepisas != null) limites.push(`${plan.limiteRepisas} repisas`)
                  if (plan.limiteItems != null) limites.push(`${plan.limiteItems} items`)
                  if (plan.limiteUsuarios != null) limites.push(`${plan.limiteUsuarios} usuarios`)
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(String(plan.id))}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--color-primary, #1976d2)' : '2px solid var(--color-border, #e0e0e0)',
                        background: isSelected ? 'var(--color-primary-bg, rgba(25,118,210,0.08))' : 'var(--color-surface, #fff)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '1.1em', marginBottom: '0.5rem' }}>
                        {plan.nombre}
                      </div>
                      {plan.descripcion && (
                        <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '0.5rem' }}>
                          {plan.descripcion}
                        </div>
                      )}
                      <div style={{ fontSize: '0.85em' }}>
                        {limites.length > 0
                          ? limites.map((l, i) => (
                              <div key={i}>{l}</div>
                            ))
                          : <div>Ilimitado</div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedPlanId && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={duracionMeses}
                    onChange={(e) => setDuracionMeses(e.target.value)}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="1">1 mes</option>
                    <option value="3">3 meses</option>
                    <option value="6">6 meses</option>
                    <option value="12">12 meses</option>
                  </select>
                  <button
                    type="button"
                    className="theme-button"
                    onClick={handleComprar}
                    disabled={isSaving || !selectedPlanId}
                  >
                    {isSaving ? 'Contratando…' : `Contratar ${planSeleccionado ? planSeleccionado.nombre : 'plan'}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {!isLoading && (!planes || planes.length === 0) && (
            <div style={{ opacity: 0.7 }}>
              No hay planes disponibles en este momento.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default SuscripcionPage
