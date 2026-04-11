import { useState } from 'react'

const SESSION_KEY = 'ares_jwt'

export function useAuth() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY))

  async function login(password) {
    const response = await fetch(`${import.meta.env.VITE_RELAY_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || 'Invalid password')
    }
    const { token: jwt } = await response.json()
    sessionStorage.setItem(SESSION_KEY, jwt)
    setToken(jwt)
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setToken(null)
  }

  return { token, login, logout }
}
