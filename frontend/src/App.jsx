import React, { useEffect, useState } from 'react'
import Header from './layouts/Header'
import RegisterPatient from './features/auth/Register'
import Login from './features/auth/Login'
import SuccessPatient from './features/auth/SuccessPatient'
import SuccessDoctor from './features/auth/SuccessDoctor'

function Home(){
  return (
    <div className="container">
      <div className="card">
        <h2>Welcome to DocApp</h2>
        <p>Use the header buttons to Register or Login.</p>
      </div>
    </div>
  )
}

export default function App(){
  const [route,setRoute] = useState(window.location.hash.replace('#','') || '/')

  useEffect(()=>{
    const onHash = ()=> setRoute(window.location.hash.replace('#','') || '/')
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  },[])

  const navigate = (path)=> { window.location.hash = path }

  let Page = Home
  if(route.startsWith('/register/patient')) Page = ()=> <RegisterPatient navigate={navigate} />
  else if(route.startsWith('/login')) Page = ()=> <Login navigate={navigate} />
  else if(route.startsWith('/success/patient')) Page = ()=> <SuccessPatient navigate={navigate} />
  else if(route.startsWith('/success/doctor')) Page = ()=> <SuccessDoctor navigate={navigate} />

  return (
    <div>
      <Header navigate={navigate} />
      <Page />
    </div>
  )
}
