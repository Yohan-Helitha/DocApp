import React, { useState } from 'react'
import Api from '../../core/api'

export default function Login({ navigate }){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [msg,setMsg] = useState('')
  const [showPassword,setShowPassword] = useState(false)
  const [remember,setRemember] = useState(false)

  async function submit(e){
    e.preventDefault()
    setMsg('')
    try{
      const r = await Api.post('/api/v1/auth/login', { email, password })
      if(r.status===200 && r.body && r.body.accessToken){
        sessionStorage.setItem('accessToken', r.body.accessToken)
        if(r.body.refreshToken) sessionStorage.setItem('refreshToken', r.body.refreshToken)
        try{ const payload = JSON.parse(atob(r.body.accessToken.split('.')[1])); const role = payload.role; if(role==='doctor') navigate('/success/doctor'); else navigate('/success/patient'); return; }catch(e){ navigate('/'); return; }
      }
      setMsg(r.body && r.body.error ? r.body.error : 'Login failed')
    }catch(err){
      setMsg('Network error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-light dark:bg-background-dark font-display">
      <div className="max-w-[480px] w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-primary/10">
        <div className="p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">health_and_safety</span>
            </div>
            <span className="text-slate-900 dark:text-slate-100 text-2xl font-bold tracking-tight">HealthSync</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-bold leading-tight">Welcome back</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Access your healthcare dashboard securely</p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Email address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="name@example.com" type="email" required />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Password</label>
                <a className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors" href="#">Forgot password?</a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                <input value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="••••••••" type={showPassword? 'text' : 'password'} required />
                <button type="button" onClick={()=>setShowPassword(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center">
                  <span className="material-symbols-outlined text-xl">{showPassword? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input id="remember" checked={remember} onChange={e=>setRemember(e.target.checked)} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/30 transition-all cursor-pointer" type="checkbox" />
              <label className="ml-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="remember">Keep me signed in</label>
            </div>

            <button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-lg shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2" type="submit">Sign in to account</button>
          </form>

          {msg && <div className="mt-4 text-center text-sm text-red-600">{msg}</div>}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-3 bg-white dark:bg-slate-900 text-slate-500">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-medium">
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path></svg>
              <span>Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-medium">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"></path></svg>
              <span>Apple</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Don't have an account? <a className="text-primary font-bold hover:underline" href="#/register/patient">Sign up now</a></p>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20"></div>

        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">verified_user</span><span>End-to-end encrypted</span></div>
          <div className="flex items-center gap-4"><a className="hover:text-primary transition-colors" href="#">Privacy Policy</a><a className="hover:text-primary transition-colors" href="#">Terms of Service</a></div>
        </div>
      </div>
    </div>
  )
}
