import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MobileNavMenu from '../components/MobileNavMenu'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import LocalNavBar from '../components/LocalNavBar'
import { backendBaseUrl } from '../utils/config'

const PricingPage = ({ theme, onThemeChange }) => {
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

  const formatCopFromCents = (cents) => {
    if (cents == null) return null
    const pesos = Number(cents) / 100
    if (!Number.isFinite(pesos)) return null
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(pesos)
  }

  useEffect(() => {
    const token = localStorage.getItem('stock pocket-token')
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
    const token = localStorage.getItem('stock pocket-token')
    if (!token) {
      return
    }
    const plan =
      planes && selectedPlanId
        ? planes.find((p) => p.id === Number(selectedPlanId))
        : null

    const duracion = Number(duracionMeses) || 1
    const precioCents = plan
      ? (duracion >= 12
        ? (plan.precioAnualCents != null ? Number(plan.precioAnualCents) : null)
        : (plan.precioMensualCents != null ? Number(plan.precioMensualCents) : null))
      : null
    const esGratis = precioCents != null && Number.isFinite(precioCents) && precioCents <= 0

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    if (esGratis) {
      fetch(`${backendBaseUrl}/api/empresas/${empresaId}/suscripcion-gratis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: Number(selectedPlanId) }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('ERROR_ACTIVAR_GRATIS')
          }
          return response.json()
        })
        .then((json) => {
          setSuccess(`Plan "${json?.planNombre || 'gratis'}" activado.`)
          window.location.href = '/suscripcion'
        })
        .catch(() => {
          setError('No se pudo activar el plan gratis. Inténtalo de nuevo.')
        })
        .finally(() => {
          setIsSaving(false)
        })
      return
    }

    fetch(`${backendBaseUrl}/api/pagos/wompi/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        empresaId: Number(empresaId),
        planId: Number(selectedPlanId),
        duracionMeses: duracion,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al iniciar el pago')
        }
        return response.json()
      })
      .then((data) => {
        if (!data || !data.checkoutUrl) {
          throw new Error('Sin checkoutUrl')
        }
        window.location.href = data.checkoutUrl
      })
      .catch(() => {
        setError('No se pudo iniciar el pago. Inténtalo de nuevo.')
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  const planSeleccionado =
    planes && selectedPlanId
      ? planes.find((p) => p.id === Number(selectedPlanId))
      : null

  const planPrecioSeleccionadoCents = (() => {
    if (!planSeleccionado) return null
    if (duracionMeses === '12') {
      return planSeleccionado.precioAnualCents != null ? Number(planSeleccionado.precioAnualCents) : null
    }
    return planSeleccionado.precioMensualCents != null ? Number(planSeleccionado.precioMensualCents) : null
  })()

  const planSeleccionadoEsGratis =
    planPrecioSeleccionadoCents != null && Number.isFinite(planPrecioSeleccionadoCents) && planPrecioSeleccionadoCents <= 0

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

  const clamp = (value, min, max) => {
    return Math.min(max, Math.max(min, value))
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

  const renderPlanBars = ({ title, subtitle, valueLabel, getValue }) => {
    if (!planes || planes.length === 0) {
      return (
        <div className="sub-chart-card">
          <div className="sub-chart-title">{title}</div>
          <div className="sub-muted">{subtitle}</div>
          <div className="sub-muted" style={{ marginTop: '10px' }}>No hay planes.</div>
        </div>
      )
    }

    const values = planes
      .map((p) => ({ plan: p, value: getValue(p) }))
    const finiteValues = values
      .map((x) => (x.value == null ? null : Number(x.value)))
      .filter((x) => x != null && Number.isFinite(x) && x > 0)
    const maxFinite = finiteValues.length > 0 ? Math.max(...finiteValues) : 1
    const hasUnlimited = values.some((x) => x.value == null)
    const denom = hasUnlimited ? maxFinite : maxFinite

    return (
      <div className="sub-chart-card">
        <div className="sub-chart-title">{title}</div>
        <div className="sub-muted">{subtitle}</div>
        <div className="sub-bars" style={{ marginTop: '12px' }}>
          {values.map(({ plan, value }) => {
            const v = value == null ? null : Number(value)
            const pct = v == null
              ? 1
              : (Number.isFinite(v) && denom > 0 ? clamp(v / denom, 0, 1) : 0)
            return (
              <div key={plan.id} className="sub-bar-row">
                <div className="sub-bar-label">{plan.nombre}</div>
                <div className="sub-bar-track">
                  <div className="sub-bar-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
                </div>
                <div className="sub-bar-value">
                  {v == null ? '∞' : `${v} ${valueLabel}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const annualSavingsPct = (() => {
    if (!planSeleccionado) return null
    const mensual = planSeleccionado.precioMensualCents
    const anual = planSeleccionado.precioAnualCents
    if (mensual == null || anual == null) return null
    const mensualNum = Number(mensual)
    const anualNum = Number(anual)
    if (!Number.isFinite(mensualNum) || !Number.isFinite(anualNum) || mensualNum <= 0 || anualNum <= 0) return null
    const equivMensual = anualNum / 12
    const ahorro = 1 - (equivMensual / mensualNum)
    if (!Number.isFinite(ahorro)) return null
    return clamp(ahorro, -1, 1)
  })()

  const isAnnual = duracionMeses === '12'

  const effectiveMonthlyFromAnnual = (plan) => {
    if (!plan || plan.precioAnualCents == null) return null
    const annual = Number(plan.precioAnualCents)
    if (!Number.isFinite(annual) || annual <= 0) return null
    return annual / 12
  }

  const formatCop = (valueInPesos) => {
    if (valueInPesos == null) return null
    const pesos = Number(valueInPesos)
    if (!Number.isFinite(pesos)) return null
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(pesos)
  }

  const formatCopFromCentsNoCurrency = (cents) => {
    if (cents == null) return null
    const pesos = Number(cents) / 100
    if (!Number.isFinite(pesos)) return null
    return new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(pesos)
  }

  const planIsCurrent = (plan) => {
    if (!suscripcionActual || !plan) return false
    if (!suscripcionActual.planId) return false
    return Number(suscripcionActual.planId) === Number(plan.id)
  }

  const renderLimit = (value) => {
    if (value == null) return 'Ilimitado'
    const n = Number(value)
    return Number.isFinite(n) ? String(n) : '—'
  }

  const comparisonRows = [
    { label: 'Almacenes', key: 'limiteAlmacenes' },
    { label: 'Armarios', key: 'limiteArmarios' },
    { label: 'Repisas', key: 'limiteRepisas' },
    { label: 'Items', key: 'limiteItems' },
    { label: 'Productos', key: 'limiteProductos' },
    { label: 'Usuarios', key: 'limiteUsuarios' },
  ]

  return (
    <main className="page admin-page cursor-pricing-page">
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
          <div className="cp-hero">
            <div className="cp-hero-left">
              <div className="cp-badge">Pricing</div>
              <h1 className="cp-title">Planes simples para crecer con control</h1>
              <div className="cp-subtitle">
                {empresaNombre
                  ? `Precios para "${empresaNombre}". Checkout seguro con Wompi.`
                  : 'Checkout seguro con Wompi.'}
              </div>
              <div className="cp-actions">
                <LocalNavBar />
                <Link to="/suscripcion" className="theme-button">
                  Ver mi usage
                </Link>
              </div>
            </div>
            <div className="cp-hero-right">
              <div className="cp-hero-card">
                <div className="cp-hero-card-top">
                  <div>
                    <div className="cp-hero-kicker">Tu plan actual</div>
                    <div className="cp-hero-metric">{suscripcionActual ? suscripcionActual.planNombre : '—'}</div>
                    <div className="cp-hero-muted">
                      {suscripcionActual && suscripcionActual.fechaFin
                        ? `Faltan ${suscripcionActual.diasRestantes} días · Fin: ${formatDateShort(suscripcionActual.fechaFin)}`
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
            <div className="cp-layout">
              <div className="cp-topbar">
                <div>
                  <div className="cp-section-kicker">Facturación</div>
                  <div className="cp-section-title">Elige mensual o anual</div>
                  <div className="cp-section-subtitle">El anual te muestra el equivalente mensual y el ahorro.</div>
                </div>
                <div className="cp-toggle" role="group" aria-label="Facturación">
                  <button
                    type="button"
                    className={`cp-toggle-btn ${!isAnnual ? 'active' : ''}`}
                    onClick={() => setDuracionMeses('1')}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    className={`cp-toggle-btn ${isAnnual ? 'active' : ''}`}
                    onClick={() => setDuracionMeses('12')}
                  >
                    Anual
                    <span className="cp-toggle-pill">Ahorra</span>
                  </button>
                </div>
              </div>

              <div className="cp-tiers">
                {(planes || []).map((plan) => {
                  const selected = selectedPlanId === String(plan.id)
                  const current = planIsCurrent(plan)

                  const priceMain = isAnnual
                    ? formatCopFromCents(plan.precioAnualCents)
                    : formatCopFromCents(plan.precioMensualCents)

                  const annualEffectiveMonthly = isAnnual ? effectiveMonthlyFromAnnual(plan) : null
                  const annualEffectiveMonthlyLabel = annualEffectiveMonthly != null
                    ? `${formatCop(annualEffectiveMonthly / 100)} / mes`
                    : null

                  return (
                    <div
                      key={plan.id}
                      className={`cp-tier ${selected ? 'selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedPlanId(String(plan.id))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedPlanId(String(plan.id))
                        }
                      }}
                    >
                      <div className="cp-tier-top">
                        <div>
                          <div className="cp-tier-name">{plan.nombre}</div>
                          {plan.descripcion && (
                            <div className="cp-tier-desc">{plan.descripcion}</div>
                          )}
                        </div>
                        <div className="cp-tier-badges">
                          {current && <div className="cp-badge-small">Actual</div>}
                          {selected && <div className="cp-badge-small primary">Elegido</div>}
                        </div>
                      </div>

                      <div className="cp-price">
                        <div className="cp-price-main">{priceMain || '—'}</div>
                        <div className="cp-price-sub">
                          {isAnnual ? 'por año' : 'por mes'}
                          {isAnnual && annualEffectiveMonthlyLabel && (
                            <span className="cp-price-hint">· {annualEffectiveMonthlyLabel}</span>
                          )}
                        </div>
                      </div>

                      <div className="cp-includes">Incluye</div>
                      <ul className="cp-features">
                        {buildPlanFeatures(plan).slice(0, 6).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>

                      <div className="cp-cta-row">
                        <button
                          type="button"
                          className={`theme-button ${selected ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPlanId(String(plan.id))
                          }}
                        >
                          Elegir plan
                        </button>
                        <div className="cp-muted">{formatCopFromCentsNoCurrency(isAnnual ? plan.precioAnualCents : plan.precioMensualCents) ? 'COP' : ''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="cp-checkout">
                <div>
                  <div className="cp-checkout-title">Checkout</div>
                  <div className="cp-checkout-sub">
                    {selectedPlanId
                      ? planSeleccionadoEsGratis
                        ? 'Este plan es gratis. Se activará de inmediato.'
                        : 'Confirma la duración y continúa al checkout de Wompi.'
                      : 'Selecciona un plan para continuar.'}
                  </div>

                  <div className="cp-checkout-row">
                    <select
                      value={duracionMeses}
                      onChange={(e) => setDuracionMeses(e.target.value)}
                      className="sub-duration"
                      disabled={!selectedPlanId}
                    >
                      <option value="1">1 mes</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                    </select>

                    <button
                      type="button"
                      className="theme-button active"
                      onClick={handleComprar}
                      disabled={isSaving || !selectedPlanId}
                    >
                      {isSaving
                        ? planSeleccionadoEsGratis
                          ? 'Activando…'
                          : 'Abriendo checkout…'
                        : planSeleccionadoEsGratis
                        ? 'Activar plan gratis'
                        : 'Pagar con Wompi'}
                    </button>
                  </div>
                </div>
                <div className="cp-checkout-side">
                  <div className="cp-checkout-side-title">Resumen</div>
                  <div className="cp-checkout-side-line">
                    <span>Plan</span>
                    <span>{planSeleccionado ? planSeleccionado.nombre : '—'}</span>
                  </div>
                  <div className="cp-checkout-side-line">
                    <span>Duración</span>
                    <span>{duracionMeses} {duracionMeses === '1' ? 'mes' : 'meses'}</span>
                  </div>
                  <div className="cp-checkout-side-muted">Serás redirigido al checkout seguro.</div>
                </div>
              </div>

              <div className="cp-compare">
                <div className="cp-section-kicker">Comparación</div>
                <div className="cp-section-title">Límites por plan</div>
                <div className="cp-section-subtitle">Valores tomados del plan configurado en el admin.</div>

                <div className="cp-table-wrap">
                  <table className="cp-table">
                    <thead>
                      <tr>
                        <th>Característica</th>
                        {(planes || []).map((p) => (
                          <th key={p.id} className={selectedPlanId === String(p.id) ? 'selected' : ''}>
                            {p.nombre}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          {(planes || []).map((p) => (
                            <td key={p.id} className={selectedPlanId === String(p.id) ? 'selected' : ''}>
                              {renderLimit(p[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cp-faq">
                <div className="cp-section-kicker">FAQ</div>
                <div className="cp-section-title">Preguntas frecuentes</div>
                <div className="cp-faq-grid">
                  <div className="cp-faq-item">
                    <div className="cp-faq-q">¿El pago es seguro?</div>
                    <div className="cp-faq-a">Sí. Usas checkout de Wompi y la aplicación solo registra el estado de la transacción.</div>
                  </div>
                  <div className="cp-faq-item">
                    <div className="cp-faq-q">¿Qué pasa si cambio de plan?</div>
                    <div className="cp-faq-a">El plan nuevo reemplaza el anterior al aprobarse el pago y queda registrado en el historial.</div>
                  </div>
                  <div className="cp-faq-item">
                    <div className="cp-faq-q">¿Puedo pagar anual?</div>
                    <div className="cp-faq-a">Sí. Selecciona “Anual” y elige 12 meses en el checkout.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default PricingPage
