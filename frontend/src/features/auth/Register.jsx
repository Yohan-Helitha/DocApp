import React, { useState } from 'react'
import Api from '../../core/api'

export default function RegisterPatient({ navigate }){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [msg,setMsg] = useState('')
  async function submit(e){
    e.preventDefault()
    const r = await Api.post('/api/v1/auth/register/patient', { email, password })
    if(r.status===201){ setMsg('Registered successfully'); setTimeout(()=>navigate('/login'),800); }
    else setMsg(r.body && r.body.error ? r.body.error : 'Registration failed')
  }
  return (
    <div className="container"><div className="card">
      <h3>Patient Registration</h3>
      <form onSubmit={submit}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" />
        <button className="btn btn-primary" type="submit">Register</button>
      </form>
      <div>{msg}</div>
    </div></div>
  )
}
