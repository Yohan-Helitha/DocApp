import React, { useEffect, useState } from 'react'
import Header from './layouts/Header'
import Footer from './layouts/Footer'
import Home from './pages/Home'
import RegisterPatient from './features/auth/Register'
import Login from './features/auth/Login'
import SuccessPatient from './features/auth/SuccessPatient'
import SuccessDoctor from './features/auth/SuccessDoctor'
import SuccessAdmin from './features/auth/SuccessAdmin'

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
  else if(route.startsWith('/success/admin')) Page = ()=> <SuccessAdmin navigate={navigate} />

  const isAdminRoute = route.startsWith('/success/admin')

  if(isAdminRoute){
    // Admin area uses its own top bar and sidebar layout (AdminLayout)
    // so we intentionally do NOT render the public Header/Footer here.
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Page />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header navigate={navigate} />
      <main className="flex-1">
        <Page />
      </main>
      <Footer />
    </div>
  )
}
