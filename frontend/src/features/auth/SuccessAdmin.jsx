import React from 'react'
import Api from '../../core/api'
import AdminLayout from '../admin/AdminLayout'

export default function SuccessAdmin({ navigate }){
  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken')
    if (refreshToken) {
      try {
        await Api.post('/api/v1/auth/logout', { refreshToken })
      } catch (e) {}
    }
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    if (navigate) navigate('/login')
    else window.location.hash = '/login'
  }

  return (
    <AdminLayout onLogout={logout} />
  )
}
