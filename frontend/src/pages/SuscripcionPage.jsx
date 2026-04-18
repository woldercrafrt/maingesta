import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MobileNavMenu from '../components/MobileNavMenu'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import LocalNavBar from '../components/LocalNavBar'
import { backendBaseUrl } from '../utils/config'

const SuscripcionPage = ({ theme, onThemeChange }) => {
  const [suscripcionActual, setSuscripcionActual] = useState(null)
  const [usage, setUsage] = useState(null)
  const [empresaId, setEmpresaId] = useState(null)
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('stock pocket-token')
    if (!token) {
      return
    }
    const headers = { Authorization: `Bearer ${token}` }

    const wompiTxId = new URLSearchParams(window.location.search).get('id')
    const confirmarPagoSiAplica = (empresaIdValue) => {
      if (!wompiTxId) {
        return Promise.resolve(null)
      }
      setIsSaving(true)
      return fetch(`${backendBaseUrl}/api/pagos/wompi/confirmar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId: wompiTxId }),
      })
        .then((r) => {
          if (!r.ok) {
            throw new Error('ERROR_CONFIRMAR')
          }
          return r.json()
        })
        .then((json) => {
          if (json && json.estado === 'APROBADA') {
            setSuccess('Pago aprobado. Suscripción activada.')
          } else if (json && json.estado === 'PENDIENTE') {
            setError('El pago aún está pendiente. Inténtalo de nuevo en unos segundos.')
          } else if (json && json.estado === 'RECHAZADA') {
            setError('El pago fue rechazado.')
          } else if (json && json.estado === 'ANULADA') {
            setError('El pago fue anulado.')
          } else if (json && json.estado === 'ERROR') {
            setError('Ocurrió un error al procesar el pago.')
          } else {
            setError('No se pudo confirmar el pago.')
          }
          if (empresaIdValue) {
            return fetch(`${backendBaseUrl}/api/empresas/${empresaIdValue}/suscripcion`, { headers })
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
          return null
        })
        .catch(() => {
          setError('No se pudo confirmar el pago. Inténtalo de nuevo.')
        })
        .finally(() => {
          window.history.replaceState(null, '', window.location.pathname)
          setIsSaving(false)
        })
    }

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
            .finally(() => {
              confirmarPagoSiAplica(emp.id)
            })

          fetch(`${backendBaseUrl}/api/empresas/${emp.id}/usage`, { headers })
            .then((r) => {
              if (!r.ok) return null
              return r.json()
            })
            .then((data) => {
              setUsage(data)
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
  }, [])

  const parseDate = (value) => {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const formatDateShort = (value) => {
    const d = parseDate(value)
    if (!d) return value || '—'
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' })
  }

  const daysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return null
    const ms = endDate.getTime() - startDate.getTime()
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  }

  const clamp = (value, min, max) => {
    return Math.min(max, Math.max(min, value))
  }

  const buildPlanFeatures = (plan) => {
    if (!plan) return []
    const features = []
    features.push(plan.limiteAlmacenes != null ? `Hasta ${plan.limiteAlmacenes} almacenes` : 'Almacenes ilimitados')
    features.push(plan.limiteArmarios != null ? `Hasta ${plan.limiteArmarios} armarios` : 'Armarios ilimitados')
    features.push(plan.limiteRepisas != null ? `Hasta ${plan.limiteRepisas} repisas` : 'Repisas ilimitadas')
    features.push(plan.limiteItems != null ? `Hasta ${plan.limiteItems} items` : 'Items ilimitados')
    features.push(plan.limiteProductos != null ? `Hasta ${plan.limiteProductos} productos` : 'Productos ilimitados')
    features.push(plan.limiteUsuarios != null ? `Hasta ${plan.limiteUsuarios} usuarios` : 'Usuarios ilimitados')
    return features
  }

  const susInicio = suscripcionActual ? parseDate(suscripcionActual.fechaInicio) : null
  const susFin = suscripcionActual ? parseDate(suscripcionActual.fechaFin) : null
  const susDiasRestantes = suscripcionActual && suscripcionActual.fechaFin != null
    ? Number(suscripcionActual.diasRestantes)
    : null
  const susTotalDias = susInicio && susFin ? daysBetween(susInicio, susFin) : null
  const susRemainingPct = susTotalDias && susDiasRestantes != null
    ? clamp(susDiasRestantes / susTotalDias, 0, 1)
    : null

  const renderDonut = ({ pct, labelTop, labelBottom }) => {
    const safePct = pct != null ? clamp(pct, 0, 1) : 0
    const r = 44
    const c = 2 * Math.PI * r
    const offset = c * (1 - safePct)
    return (
      <div className="sub-donut">
        <svg viewBox="0 0 120 120" className="sub-donut-svg" aria-hidden="true">
          <circle className="sub-donut-track" cx="60" cy="60" r={r} fill="none" />
          <circle
            className="sub-donut-value"
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="sub-donut-center">
          <div className="sub-donut-top">{labelTop}</div>
          <div className="sub-donut-bottom">{labelBottom}</div>
        </div>
      </div>
    )
  }

  const renderUsageBar = ({ label, used, limit }) => {
    const usedNum = used != null ? Number(used) : 0
    const limitNum = limit != null ? Number(limit) : null
    const pct = limitNum && Number.isFinite(limitNum) && limitNum > 0
      ? clamp(usedNum / limitNum, 0, 1)
      : 1

    return (
      <div className="sub-bar-row" key={label}>
        <div className="sub-bar-label">{label}</div>
        <div className="sub-bar-track">
          <div className="sub-bar-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
        <div className="sub-bar-value">
          {limitNum == null || !Number.isFinite(limitNum)
            ? `${usedNum} / ∞`
            : `${usedNum} / ${limitNum}`}
        </div>
      </div>
    )
  }

  return (
    <main className="page admin-page subscription-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-topbar-mark" />
          <span className="admin-topbar-title">Stock Pocket</span>
        </div>
        <div className="admin-header-right">
          <MobileNavMenu />
          <Link to="/home" className="theme-button">
            Home
          </Link>
          <ThemeSelector theme={theme} onChange={onThemeChange} />
          <UserMenu />
        </div>
      </header>
      <div className="admin-body">
        <div className="admin-main" style={{ maxWidth: '1180px', margin: '0 auto', padding: '2rem' }}>
          <div className="sub-hero">
            <div className="sub-hero-left">
              <div className="sub-kicker">Suscripción</div>
              <h2 className="sub-title">Usage y características</h2>
              <div className="sub-muted" style={{ marginTop: '10px', maxWidth: '56ch' }}>
                {empresaNombre
                  ? `Información de suscripción de "${empresaNombre}".`
                  : 'Información de suscripción de tu empresa.'}
              </div>
              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <LocalNavBar />
                <Link to="/pricing" className="theme-button active">
                  Actualizar / Cambiar suscripción
                </Link>
              </div>
            </div>

            <div className="sub-hero-right">
              <div className="sub-hero-card">
                <div className="sub-hero-card-top">
                  <div>
                    <div className="sub-kicker">Tiempo restante</div>
                    <div className="sub-hero-metric">
                      {suscripcionActual && suscripcionActual.fechaFin
                        ? `${suscripcionActual.diasRestantes} días`
                        : '—'}
                    </div>
                    <div className="sub-muted">
                      {suscripcionActual && suscripcionActual.fechaFin
                        ? `Fin: ${formatDateShort(suscripcionActual.fechaFin)}`
                        : suscripcionActual
                          ? 'Sin fecha fin'
                          : 'Sin suscripción activa'}
                    </div>
                  </div>
                  {renderDonut({
                    pct: susRemainingPct,
                    labelTop: susRemainingPct != null ? `${Math.round(susRemainingPct * 100)}%` : '—',
                    labelBottom: 'restante',
                  })}
                </div>
              </div>
            </div>
          </div>

          {(error || success) && (
            <div className="sub-alerts">
              {error && <div className="sub-alert sub-alert--error">{error}</div>}
              {success && <div className="sub-alert sub-alert--success">{success}</div>}
            </div>
          )}

          {isLoading && <p>Cargando…</p>}

          {!isLoading && (
            <div className="sub-section">
              <div className="sub-section-top">
                <div>
                  <div className="sub-kicker">Mi suscripción</div>
                  <div className="sub-section-title">Uso y límites</div>
                  <div className="sub-muted" style={{ marginTop: '6px' }}>
                    {suscripcionActual
                      ? 'Revisa tu consumo actual frente a los límites del plan.'
                      : 'No tienes un plan activo. Puedes elegir uno en Pricing.'}
                  </div>
                </div>
                <Link to="/pricing" className="theme-button active">
                  Actualizar / Cambiar
                </Link>
              </div>

              {suscripcionActual && (
                <div className="sub-stats">
                  <div className="sub-stat">
                    <div className="sub-stat-label">Plan</div>
                    <div className="sub-stat-value">{suscripcionActual.planNombre}</div>
                  </div>
                  <div className="sub-stat">
                    <div className="sub-stat-label">Inicio</div>
                    <div className="sub-stat-value">{formatDateShort(suscripcionActual.fechaInicio)}</div>
                  </div>
                  <div className="sub-stat">
                    <div className="sub-stat-label">Fin</div>
                    <div className="sub-stat-value">
                      {suscripcionActual.fechaFin ? formatDateShort(suscripcionActual.fechaFin) : '∞'}
                    </div>
                  </div>
                  <div className="sub-stat">
                    <div className="sub-stat-label">Auto-renovación</div>
                    <div className="sub-stat-value">
                      {typeof suscripcionActual.autoRenovar === 'boolean'
                        ? (suscripcionActual.autoRenovar ? 'Sí' : 'No')
                        : 'No disponible'}
                    </div>
                  </div>
                </div>
              )}

              {suscripcionActual && usage && suscripcionActual.plan && (
                <div style={{ marginTop: '14px' }}>
                  <div className="sub-kicker">Usage</div>
                  <div className="sub-bars" style={{ marginTop: '10px' }}>
                    {renderUsageBar({
                      label: 'Usuarios',
                      used: usage.usuarios,
                      limit: suscripcionActual.plan.limiteUsuarios,
                    })}
                    {renderUsageBar({
                      label: 'Items',
                      used: usage.items,
                      limit: suscripcionActual.plan.limiteItems,
                    })}
                    {renderUsageBar({
                      label: 'Almacenes',
                      used: usage.almacenes,
                      limit: suscripcionActual.plan.limiteAlmacenes,
                    })}
                    {renderUsageBar({
                      label: 'Armarios',
                      used: usage.armarios,
                      limit: suscripcionActual.plan.limiteArmarios,
                    })}
                    {renderUsageBar({
                      label: 'Repisas',
                      used: usage.repisas,
                      limit: suscripcionActual.plan.limiteRepisas,
                    })}
                    {renderUsageBar({
                      label: 'Productos',
                      used: usage.productos,
                      limit: suscripcionActual.plan.limiteProductos,
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '14px' }}>
                <ul className="sub-features">
                  {suscripcionActual && suscripcionActual.plan
                    ? buildPlanFeatures(suscripcionActual.plan).map((f) => <li key={f}>{f}</li>)
                    : (
                      <>
                        <li>Selecciona un plan para ver características.</li>
                      </>
                    )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default SuscripcionPage
