import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import ThemeSelector from '../components/ThemeSelector'
import { backendBaseUrl } from '../utils/config'
import { useAuth } from '../context/AuthContext'

const LoginPage = ({ theme, onThemeChange }) => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loginCorreo, setLoginCorreo] = useState('')
  const [loginClave, setLoginClave] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const social = searchParams.get('social')
    const token = searchParams.get('token')
    if (!social || !token) {
      return
    }
    const role = searchParams.get('role')
    const id = searchParams.get('id')
    const nombre = searchParams.get('nombre')
    const correo = searchParams.get('correo')
    const foto = searchParams.get('foto')
    
    // Update Auth Context
    login(token, role, {
        id: id,
        nombre: nombre,
        correo: correo,
        foto: foto
    })
    navigate('/home', { replace: true })
  }, [navigate, searchParams, login])

  const handleManualLogin = (event) => {
    event.preventDefault()
    if (!loginCorreo.trim() || !loginClave.trim()) {
      return
    }
    setIsLoggingIn(true)
    setLoginError('')
    fetch(`${backendBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correo: loginCorreo.trim(),
        clave: loginClave,
      }),
    })
      .then((response) => {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        if (!response.ok) {
          throw new Error('LOGIN_ERROR')
        }
        return response.json()
      })
      .then((data) => {
        if (!data || !data.token || !data.usuario) {
          throw new Error('LOGIN_ERROR')
        }
        const { token, usuario, role } = data
        
        login(token, role, usuario)
        
        navigate('/home', { replace: true })
      })
      .catch((err) => {
        if (err && err.message === 'UNAUTHORIZED') {
          setLoginError('Correo o contraseña incorrectos.')
        } else {
          setLoginError('No se pudo iniciar sesión. Intenta de nuevo.')
        }
      })
      .finally(() => {
        setIsLoggingIn(false)
      })
  }

  return (
    <main className="page">
      <section className="card">
        <header className="header">
          <div>
            <h1 className="title">Inicio de sesión</h1>
            <p className="subtitle">Acceso al sistema de Maingest</p>
          </div>
          <ThemeSelector theme={theme} onChange={onThemeChange} />
        </header>
        <form className="form" onSubmit={handleManualLogin}>
          <label className="field">
            <span>Correo</span>
            <input
              type="email"
              name="email"
              placeholder="correo@empresa.com"
              autoComplete="username"
              value={loginCorreo}
              onChange={(event) => setLoginCorreo(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={loginClave}
              onChange={(event) => setLoginClave(event.target.value)}
              required
            />
          </label>
          <div className="actions">
            <button
              type="submit"
              className="button"
              disabled={isLoggingIn || !loginCorreo.trim() || !loginClave.trim()}
            >
              {isLoggingIn ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
            <Link to="/home" className="button ghost">
              Ir al home
            </Link>
          </div>
          {loginError && <p className="subtitle">{loginError}</p>}
        </form>
        <div className="divider">o</div>
        <div className="social-buttons">
          <a className="button social google" href={`${backendBaseUrl}/oauth2/authorization/google`}>
            <span className="social-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.7 1.23 9.2 3.64l6.87-6.87C35.84 2.32 30.33 0 24 0 14.6 0 6.48 5.38 2.56 13.2l7.98 6.2C12.44 13.42 17.8 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.1 24.5c0-1.56-.14-3.06-.4-4.5H24v8.5h12.4c-.54 2.9-2.14 5.35-4.56 7l7 5.4C43.6 37.2 46.1 31.3 46.1 24.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.54 28.7A14.5 14.5 0 0 1 9.5 24c0-1.64.28-3.22.78-4.7l-7.98-6.2A23.97 23.97 0 0 0 0 24c0 3.88.93 7.55 2.3 10.8l8.24-6.1z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.33 0 11.64-2.08 15.52-5.6l-7-5.4c-1.95 1.32-4.46 2.1-8.52 2.1-6.2 0-11.46-3.92-13.36-9.4l-8.24 6.1C6.46 42.62 14.6 48 24 48z"
                />
              </svg>
            </span>
            <span>Continuar con Google</span>
          </a>
          <a className="button social microsoft" href={`${backendBaseUrl}/oauth2/authorization/microsoft`}>
            <span className="social-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path fill="#F35325" d="M2 2h9v9H2z" />
                <path fill="#81BC06" d="M13 2h9v9h-9z" />
                <path fill="#05A6F0" d="M2 13h9v9H2z" />
                <path fill="#FFBA08" d="M13 13h9v9h-9z" />
              </svg>
            </span>
            <span>Continuar con Microsoft</span>
          </a>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
