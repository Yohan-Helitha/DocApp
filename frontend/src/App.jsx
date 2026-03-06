import React, { useEffect, useState } from 'react'
import Header from './layouts/Header'
import RegisterPatient from './features/auth/Register'
import Login from './features/auth/Login'
import SuccessPatient from './features/auth/SuccessPatient'
import SuccessDoctor from './features/auth/SuccessDoctor'

function Home(){
  return (<div className="container"><div className="card"><h2>Welcome to DocApp</h2><p>Use the header buttons to Register or Login.</p></div></div>)
}

export default function App(){
  const [route,setRoute] = useState(window.location.hash.replace('#','') || '/')
  useEffect(()=>{ const onHash=()=>setRoute(window.location.hash.replace('#','')||'/'); window.addEventListener('hashchange', onHash); return ()=>window.removeEventListener('hashchange', onHash); },[])
  const navigate = (path)=> { window.location.hash = path }
  let Page = Home
  if(route.startsWith('/register/patient')) Page = ()=> <RegisterPatient navigate={navigate} />
  else if(route.startsWith('/login')) Page = ()=> <Login navigate={navigate} />
  else if(route.startsWith('/success/patient')) Page = SuccessPatient
  else if(route.startsWith('/success/doctor')) Page = SuccessDoctor

  return (
    <div>
      <Header navigate={navigate} />
      <Page />
    </div>
  )
}
const { useState, useEffect } = React;

function Home(){
  return (
    <div className="container"><div className="card"><h2>Welcome to DocApp</h2><p>Use the header buttons to Register or Login.</p></div></div>
  );
}

function App(){
  const [route, setRoute] = useState(window.location.hash.replace('#','') || '/');
  useEffect(()=>{
    const onHash = ()=> setRoute(window.location.hash.replace('#','') || '/');
    window.addEventListener('hashchange', onHash);
    return ()=> window.removeEventListener('hashchange', onHash);
  },[]);

  function navigate(path){ window.location.hash = path; }

  let Page = null;
  if(route === '/' || route === '') Page = Home;
  else if(route.startsWith('/register/patient')) Page = ()=> React.createElement(window.RegisterPatient, { onNavigate:navigate });
  else if(route.startsWith('/login')) Page = ()=> React.createElement(window.Login, { onNavigate:navigate });
  else if(route.startsWith('/success/patient')) Page = window.SuccessPatient;
  else if(route.startsWith('/success/doctor')) Page = window.SuccessDoctor;
  else Page = Home;

  return (
    <div>
      <Header onNavigate={(p)=>navigate(p)} />
      <Page />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
