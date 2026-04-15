import React, { useState, useMemo } from 'react'
import Api from '../../core/api'

export default function RegisterPatient({ navigate }){
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [confirm,setConfirm] = useState('')
  const [terms,setTerms] = useState(false)
  const [msg,setMsg] = useState('')
  const [submitting,setSubmitting] = useState(false)

  const strength = useMemo(()=>{
    if(password.length >= 12) return {label: 'Strong', pct: '100%'}
    if(password.length >= 8) return {label: 'Moderate', pct: '66%'}
    if(password.length > 0) return {label: 'Weak', pct: '33%'}
    return {label: '', pct: '0%'}
  },[password])

  function valid(){
    return name.trim() && email.trim() && password && password===confirm && terms
  }

  async function submit(e){
    e.preventDefault()
    setMsg('')
    if(!valid()){ setMsg('Please complete the form and accept terms'); return }
    setSubmitting(true)
    try{
      const r = await Api.post('/api/v1/auth/register/patient', { name, email, password })
      if(r.status===201){ setMsg('Registered successfully'); setTimeout(()=>navigate('/login'),800); }
      else setMsg(r.body && r.body.error ? r.body.error : 'Registration failed')
    }catch(err){ setMsg('Network error') }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-light dark:bg-background-dark">
      <div className="max-w-md w-full mx-auto p-4">
        <div className="bg-slate-900 rounded-xl shadow-xl shadow-primary/5 border border-slate-800 p-8 text-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-100">Create your account</h1>
            <p className="text-slate-400 mt-2 text-sm">Start your journey to better health management today.</p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="John Doe" type="text" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="name@example.com" type="email" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                <input value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="••••••••" type="password" required />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary" type="button" onClick={()=>{ /* optional toggle */ }}>
                  <span className="material-symbols-outlined text-xl">visibility</span>
                </button>
              </div>
              <div className="mt-3">
                <div className="flex gap-1 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div style={{width: strength.pct}} className="bg-primary rounded-full transition-all"></div>
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-[11px] font-medium text-primary">Password strength: {strength.label || '—'}</p>
                  <p className="text-[11px] text-slate-400 italic">Use 8+ characters</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock_reset</span>
                <input value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="••••••••" type="password" required />
              </div>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <div className="flex items-center h-5">
                <input id="terms" checked={terms} onChange={e=>setTerms(e.target.checked)} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/30 cursor-pointer" type="checkbox" />
              </div>
              <label className="text-xs text-slate-400 leading-normal cursor-pointer" htmlFor="terms">By creating an account, I agree to the <a className="text-primary font-medium hover:underline" href="#">Terms of Service</a> and <a className="text-primary font-medium hover:underline" href="#">Privacy Policy</a>.</label>
            </div>

            <button disabled={!valid() || submitting} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60" type="submit">
              Create Account
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400">Already have an account? <a className="text-primary font-bold hover:text-primary/80 ml-1" href="#/login">Log in</a></p>
            <p className="text-sm text-slate-400 mt-2">If you are a Doctor? <a className="text-primary font-bold hover:text-primary/80 ml-1" href="#/register/doctor">Register here</a></p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center opacity-60">
          <div className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-slate-500 text-2xl">verified_user</span><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Secure</span></div>
          <div className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-slate-500 text-2xl">encrypted</span><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Private</span></div>
          <div className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-slate-500 text-2xl">health_and_safety</span><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Trusted</span></div>
        </div>
      </div>
    </div>
  )
}
