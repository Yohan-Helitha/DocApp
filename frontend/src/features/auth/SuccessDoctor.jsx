import React, { useEffect, useState } from 'react'
import Api from '../../core/api'

export default function SuccessDoctor({ navigate }){
  const [doctor, setDoctor] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const token = sessionStorage.getItem('accessToken')

  useEffect(() => {
    const load = async () => {
      setError('')

      if (!token) {
        setError('Your session has expired. Please sign in again.')
        setLoading(false)
        if (navigate) navigate('/login')
        else window.location.hash = '/login'
        return
      }

      try {
        let userId = ''
        try {
          userId = JSON.parse(atob(token.split('.')[1])).sub
        } catch {
          setError('Invalid login session. Please sign in again.')
          setLoading(false)
          if (navigate) navigate('/login')
          else window.location.hash = '/login'
          return
        }

        const dRes = await Api.get('/api/v1/doctors', token)
        if (dRes.status !== 200) {
          setError(dRes.body?.message || dRes.body?.error || `Failed to load doctor profile (${dRes.status}).`)
          setLoading(false)
          return
        }

        const me = (dRes.body?.doctors || []).find(d => d.user_id === userId)
        if (!me) {
          setError('No doctor profile found for this account.')
          setLoading(false)
          return
        }

        setDoctor(me)
        const aRes = await Api.get(`/api/v1/appointments/doctors/${me.doctor_id}`, token)
        if (aRes.status === 200) setAppointments(aRes.body?.appointments || [])
        else setError(aRes.body?.message || aRes.body?.error || `Failed to load appointments (${aRes.status}).`)
      } catch {
        setError('Failed to load dashboard data. Please try again.')
      }
      setLoading(false)
    }
    load()
  }, [])

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

  const goTo = (path) => {
    if(navigate) navigate(path)
    else window.location.hash = path
  }

  const pending   = appointments.filter(a => a.appointment_status === 'pending')
  const confirmed = appointments.filter(a => a.appointment_status === 'confirmed')
  const recent    = [...confirmed, ...appointments.filter(a => a.appointment_status === 'completed')]
    .slice(0, 5)

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 p-4 z-40">
        <div className="mb-10 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">clinical_notes</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0b9385]">SmartHealth AI</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo('/doctor/appointments')}
          >
            <span className="material-symbols-outlined">event</span>
            <span className="font-semibold text-sm">Appointments</span>
            {pending.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
            )}
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo('/doctor/availability')}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="font-semibold text-sm">Availability</span>
          </a>
          <button
            type="button"
            onClick={() => (navigate ? navigate('/telemedicine') : (window.location.hash = '/telemedicine'))}
            className="w-full text-left text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200"
          >
            <span className="material-symbols-outlined" data-icon="video_chat">video_chat</span>
            <span className="font-semibold text-sm">Telemedicine</span>
          </button>
        </nav>
        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50">
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <span className="font-semibold text-sm">Help Center</span>
          </a>
          <button onClick={logout} className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      <main className="md:ml-64 p-8 min-h-screen">
        <header className="flex justify-between items-end mb-12">
          <div>
            <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary mb-2 block">{todayStr}</span>
            {loading ? (
              <div className="h-10 w-72 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Welcome, {doctor ? `Dr. ${doctor.full_name}` : 'Doctor'}
              </h2>
            )}
            {doctor && (
              <p className="text-slate-400 font-medium mt-1">{doctor.specialization}</p>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="h-10 w-[1px] bg-slate-200"></div>
            <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              {pending.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
              )}
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-lg">
              {doctor ? doctor.full_name.charAt(0).toUpperCase() : 'D'}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* Left column */}
            <section className="col-span-12 lg:col-span-8 space-y-8">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'Total', value: appointments.length, icon: 'event', color: 'text-primary' },
                  { label: 'Pending', value: pending.length, icon: 'pending_actions', color: 'text-yellow-600' },
                  { label: 'Confirmed', value: confirmed.length, icon: 'check_circle', color: 'text-green-600' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                    <span className={`material-symbols-outlined text-3xl ${stat.color}`}>{stat.icon}</span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-2">{stat.value}</p>
                    <p className="text-xs font-bold uppercase text-slate-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Today's / Recent Schedule */}
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">calendar_today</span>
                      Confirmed Sessions
                    </h3>
                    <button
                      onClick={() => goTo('/doctor/appointments')}
                      className="text-primary font-bold text-xs uppercase tracking-wider hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  {confirmed.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <span className="material-symbols-outlined text-4xl block mb-2">event_available</span>
                      <p className="text-sm">No confirmed sessions</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {confirmed.slice(0, 4).map((a, i) => (
                        <div key={a.appointment_id} className="flex gap-4 group cursor-pointer" onClick={() => goTo('/doctor/appointments')}>
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-400">#{i + 1}</span>
                            <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 flex-1 group-hover:bg-slate-100 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-slate-900 text-sm font-mono">
                                #{a.appointment_id.slice(0, 8).toUpperCase()}
                              </p>
                              <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">Confirmed</span>
                            </div>
                            {a.reason_for_visit && (
                              <p className="text-xs text-slate-500">{a.reason_for_visit}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Requests */}
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">pending_actions</span>
                      Pending Requests
                    </h3>
                    {pending.length > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {pending.length} New
                      </span>
                    )}
                  </div>
                  {pending.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <span className="material-symbols-outlined text-4xl block mb-2">inbox</span>
                      <p className="text-sm">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pending.slice(0, 3).map(a => (
                        <div key={a.appointment_id} className="border border-slate-100 rounded-2xl p-5 hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              <span className="material-symbols-outlined text-sm">person</span>
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900 font-mono">
                                #{a.appointment_id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          {a.reason_for_visit && (
                            <p className="text-xs text-slate-500 mb-3">{a.reason_for_visit}</p>
                          )}
                          <button
                            onClick={() => goTo('/doctor/appointments')}
                            className="w-full text-[11px] font-bold py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                          >
                            Review Request
                          </button>
                        </div>
                      ))}
                      {pending.length > 3 && (
                        <button
                          onClick={() => goTo('/doctor/appointments')}
                          className="w-full text-xs font-bold text-primary hover:underline py-2"
                        >
                          +{pending.length - 3} more pending requests
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Right column */}
            <section className="col-span-12 lg:col-span-4 space-y-8">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">bolt</span>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => goTo('/doctor/appointments')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-left transition-colors group"
                  >
                    <span className="material-symbols-outlined text-primary">event</span>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-primary">Manage Appointments</span>
                  </button>
                  <button
                    onClick={() => goTo('/doctor/availability')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-left transition-colors group"
                  >
                    <span className="material-symbols-outlined text-primary">calendar_month</span>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-primary">Update Availability</span>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">insights</span>
                  Activity Summary
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Total Appointments', value: appointments.length, color: 'bg-primary' },
                    { label: 'Awaiting Review', value: pending.length, color: 'bg-yellow-400' },
                    { label: 'Confirmed', value: confirmed.length, color: 'bg-green-400' },
                    { label: 'Completed', value: appointments.filter(a => a.appointment_status === 'completed').length, color: 'bg-blue-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 ${item.color} rounded-full`}></div>
                        <span className="text-sm text-slate-600">{item.label}</span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10">
                  <span className="material-symbols-outlined" style={{fontSize: 120}}>notifications_active</span>
                </div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                  System Status
                </h3>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                    <p className="text-xs leading-relaxed">
                      <span className="font-bold">Platform Online:</span> All services are running normally.
                    </p>
                  </div>
                  {doctor && (
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">verified</span>
                      <p className="text-xs leading-relaxed">
                        <span className="font-bold">Profile Status:</span>{' '}
                        {doctor.verification_status === 'approved' ? 'Verified and active.' : `Status: ${doctor.verification_status}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )

}
