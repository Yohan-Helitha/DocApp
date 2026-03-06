import React from 'react'

export default function Header({ navigate }){
  return (
    <header className="site-header">
      <div className="logo">DocApp</div>
      <nav>
        <button className="btn" onClick={()=>navigate('/register/patient')}>Register</button>
        <button className="btn btn-primary" onClick={()=>navigate('/login')}>Login</button>
      </nav>
    </header>
  )
}
