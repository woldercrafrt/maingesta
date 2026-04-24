import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import UserMenu from '../components/UserMenu'
import { useAuth } from '../context/AuthContext'

const LandingPage = ({ theme, onThemeChange }) => {
  const navigate = useNavigate()
  const { token } = useAuth()

  useEffect(() => {
    if (token) {
      navigate('/home', { replace: true })
    }
  }, [token, navigate])

  return (
    <main className="page landing-page">
      <section className="landing-shell">
        <header className="landing-topbar">
          <div className="landing-brand">
            <div className="landing-mark" />
            <span className="landing-brand-title">Stock Pocket</span>
          </div>
          <nav className="landing-topbar-actions">
            <ThemeSelector theme={theme} onChange={onThemeChange} />
            <UserMenu />
            <Link to="/login" className="theme-button active">
              Entrar
            </Link>
          </nav>
        </header>

        <div className="landing-hero">
          <div className="landing-hero-copy">
            <h1 className="landing-title">Inventario simple, visual y rápido.</h1>
            <p className="landing-subtitle">
              Controla almacenes, armarios y repisas con una vista clara. Mantén el catálogo, registra movimientos y toma decisiones con tu equipo.
            </p>
            <div className="landing-cta">
              <Link to="/login" className="theme-button active landing-cta-primary">
                Probar ahora
              </Link>
              <a href="#demo" className="theme-button landing-cta-secondary">
                Ver demo
              </a>
            </div>
          </div>
          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-hero-card">
              <img
                src="/landing-hero.svg"
                alt=""
                className="landing-hero-img"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>

        <section id="demo" className="landing-section">
          <div className="landing-section-head">
            <h2 className="landing-h2">Un vistazo en 5 segundos</h2>
            <p className="landing-p">
              Aquí va un video corto mostrando el flujo principal. Coloca tu archivo en <code>/public/landing-demo.mp4</code>.
            </p>
          </div>

          <div className="landing-video-frame">
            <video
              className="landing-video"
              src="/landing-demo.mp4"
              poster="/landing-poster.svg"
              playsInline
              muted
              loop
              autoPlay
              controls
            />
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <h2 className="landing-h2">Capturas</h2>
            <p className="landing-p">Algunas pantallas para entender el producto rápidamente.</p>
          </div>

          <div className="landing-gallery">
            <figure className="landing-shot">
              <img src="/landing-shot-1.svg" alt="Vista de almacenes" loading="lazy" decoding="async" />
            </figure>
            <figure className="landing-shot">
              <img src="/landing-shot-2.svg" alt="Vista de catálogo" loading="lazy" decoding="async" />
            </figure>
            <figure className="landing-shot">
              <img src="/landing-shot-3.svg" alt="Vista de suscripción" loading="lazy" decoding="async" />
            </figure>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <span className="landing-footer-brand">Stock Pocket</span>
            <span className="landing-footer-muted">© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </section>
    </main>
  )
}

export default LandingPage
