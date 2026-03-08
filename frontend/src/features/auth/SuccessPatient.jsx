import React from 'react'
import Api from '../../core/api'

export default function SuccessPatient({ navigate }){
  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken')
    if(refreshToken){
      try{ await Api.post('/api/v1/auth/logout', { refreshToken }) }catch(e){}
    }
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    if(navigate) navigate('/login')
    else window.location.hash = '/login'
  }

  return (
    <div className="container"><div className="card">
      <h2 className="success">Patient login successfully</h2>
      <button className="btn" onClick={logout}>Logout</button>
    </div></div>
  )
}
