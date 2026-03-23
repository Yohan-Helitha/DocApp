import React from 'react'
import Api from '../../core/api'

export default function SuccessAdmin({ navigate }){
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
    <div className="min-h-screen bg-background text-on-background antialiased">
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 z-40">
        <div className="flex flex-col h-full p-4">
          <div className="mb-10 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-[#0b9385] leading-none">Teal Obsidian</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Clinical Curator</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 font-semibold transition-all hover:translate-x-1 duration-200" href="#">
              <span className="material-symbols-outlined">dashboard</span>
              <span>Overview</span>
            </a>
            <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
              <span className="material-symbols-outlined">event</span>
              <span>Appointments</span>
            </a>
            <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
              <span className="material-symbols-outlined">description</span>
              <span>Medical Records</span>
            </a>
            <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
              <span className="material-symbols-outlined">forum</span>
              <span>Messages</span>
            </a>
            <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
              <span className="material-symbols-outlined">insert_chart</span>
              <span>Analytics</span>
            </a>
          </nav>

          <div className="mt-auto mb-6 px-2">
            <button className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-transform" onClick={() => {}}>
              Start AI Consultation
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1">
            <a className="text-slate-500 dark:text-slate-400 px-4 py-2 flex items-center gap-3 font-semibold text-xs hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined text-lg">help</span>
              <span>Help Center</span>
            </a>
            <button onClick={logout} className="text-slate-500 dark:text-slate-400 px-4 py-2 flex items-center gap-3 font-semibold text-xs hover:text-error transition-colors w-full text-left">
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 p-8 min-h-screen">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Platform Overview</h2>
            <p className="text-slate-500 font-medium">Real-time system health and administrative metrics.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-surface-container-low px-4 py-2 rounded-xl flex items-center gap-2 border border-outline-variant/50">
              <span className="material-symbols-outlined text-slate-400">calendar_today</span>
              <span className="text-sm font-bold text-slate-700">Oct 24, 2023 - Oct 31, 2023</span>
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-primary/20">
              <img alt="Admin Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbOgJ1Y8Lt4FZn3BShssmqsvA-hKn6-eg7-fncHLjFLI7vM8DbyGtswGtOh8TAfRE2ZkjOJUUwPdOlJj36MHuZ-aFm0WAnEyMXhulZ6NNWyjxItXyk_1Lr7gfO65wgzuJR1y04c0w5Ql3i55mXQBicIdTKnAQGdQBB3Glqeprsfr7-JL87S7TkmeTGBQ_dDreSyMQ1f8kNoVXMCqiZV4gmHInyaIpNuGxRnFitzpnNvO_AFVN6QWDlDtTThBsm22keE8ttj0g-_GM"/>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-primary mb-1 block">Total Patients</span>
              <h3 className="text-4xl font-extrabold text-slate-900">12,482</h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
              <span className="material-symbols-outlined text-sm mr-1">trending_up</span> +12% this month
            </div>
          </div>
          <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-primary mb-1 block">Active Doctors</span>
              <h3 className="text-4xl font-extrabold text-slate-900">842</h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
              <span className="material-symbols-outlined text-sm mr-1">person_add</span> 48 new signups
            </div>
          </div>
          <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-primary mb-1 block">Active Appts</span>
              <h3 className="text-4xl font-extrabold text-slate-900">1,204</h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full w-fit">
              <span className="material-symbols-outlined text-sm mr-1">schedule</span> Peak time: 10:00 AM
            </div>
          </div>
          <div className="col-span-1 bg-[#0b9385] p-6 rounded-xl shadow-lg border border-primary/20 flex flex-col justify-between text-white">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-primary-container mb-1 block">Completion Rate</span>
              <h3 className="text-4xl font-extrabold">98.4%</h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-white/80">
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full" style={{width: '98%'}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h4 className="text-lg font-bold text-slate-900">Doctor Verification Queue</h4>
                <span className="px-3 py-1 bg-error-container text-on-error-container text-xs font-bold rounded-full">3 Pending</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Practitioner</th>
                      <th className="px-6 py-4">Specialization</th>
                      <th className="px-6 py-4">License ID</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100">
                            <img alt="Doctor" className="w-full h-full rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3-RG3Wj65Gc4TFuB248MazX0A9P3g1cVO3PnybcW3cBRnSb3LjKN5K7h41EXKtyAuvCPZf5T7uxkztR3hDY3-d3MujYFK_PI2-QMP372U219N_7XuiH8BPIo4QCCAXf8lAxlDHLrXYWPKJatosH0MZ7aM67vOwJ5nCcVOL_bRdWyutmp4BpLtziCvF8837e1pPBOFJpK4s02uy6IuzpuEIY8XkwBLJwLmFajAMzgXV5GvmZr2YpezXjjf-SfQijdHVlW1zwg9bfw"/>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Dr. Sarah Jenkins</p>
                            <p className="text-[10px] text-slate-500">Joined 2 days ago</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">Neurology</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">MED-99201-X</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="text-primary hover:bg-primary/5 p-1.5 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                        <button className="text-error hover:bg-error/5 p-1.5 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-lg">cancel</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100">
                            <img alt="Doctor" className="w-full h-full rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxDuYa6uRxi1mFT8_U2cPevYE_Zi1qLn-E7o15UjUwAyPIZAALJuHPVg1atXR0BHUYvI96s5DXubeI7EkYNqPt5JxaxYo45oyacRkwelKrsPOnQZKAmkLbDqiDXadwg2ggb0tDC2OVALYHz7wo4LpqfWZB5ZAmc8M7A45qhmYpncS7P1NHx7zU1qDoMZAOSf898ArVn3byDpFnElHLIPC__ZMUrrAqI-RI7VdPCh2DuDLIJW2Q7Xz6NTdKDskvfofVOe-HI9rur34"/>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Dr. Marcus Thorne</p>
                            <p className="text-[10px] text-slate-500">Joined 4 days ago</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">Cardiology</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">MED-44812-B</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="text-primary hover:bg-primary/5 p-1.5 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                        <button className="text-error hover:bg-error/5 p-1.5 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-lg">cancel</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h4 className="text-lg font-bold text-slate-900">Recent Transactions</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Patient / Doctor</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">Alice Cooper</span>
                          <span className="material-symbols-outlined text-xs text-slate-300">arrow_forward</span>
                          <span className="text-sm font-medium text-slate-600">Dr. Jenkins</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-slate-900">$150.00</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="material-symbols-outlined text-lg">credit_card</span>
                          <span className="text-xs font-bold uppercase">Stripe</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded">Success</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">Bob Miller</span>
                          <span className="material-symbols-outlined text-xs text-slate-300">arrow_forward</span>
                          <span className="text-sm font-medium text-slate-600">Dr. Thorne</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-slate-900">$210.00</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="material-symbols-outlined text-lg">account_balance</span>
                          <span className="text-xs font-bold uppercase">Bank</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded">Pending</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-slate-900 text-white rounded-xl shadow-2xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white/50">Financial Snapshot</h4>
                  <span className="material-symbols-outlined text-primary">payments</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Total Gross Volume</p>
                    <p className="text-3xl font-black">$482,900.00</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Payouts</p>
                      <p className="text-lg font-bold">$392k</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Refunds</p>
                      <p className="text-lg font-bold text-red-400">$2.4k</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">User Growth</h4>
              <div className="flex items-end gap-2 h-32 mb-4">
                <div className="w-full bg-primary/10 rounded-t-lg h-[40%]"></div>
                <div className="w-full bg-primary/20 rounded-t-lg h-[60%]"></div>
                <div className="w-full bg-primary/40 rounded-t-lg h-[50%]"></div>
                <div className="w-full bg-primary/60 rounded-t-lg h-[80%]"></div>
                <div className="w-full bg-primary rounded-t-lg h-[95%]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-400">
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
              </div>
            </section>

            <section className="bg-surface-container-low rounded-xl border border-outline-variant/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-900">System Logs</h4>
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-sm text-primary mt-1">info</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">AI Model Updated</p>
                    <p className="text-[10px] text-slate-500">v2.4 deployed to production-east</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-1">2 mins ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-sm text-amber-500 mt-1">warning</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">High API Latency</p>
                    <p className="text-[10px] text-slate-500">Node-04 reporting 450ms response time</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-1">15 mins ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-sm text-slate-400 mt-1">lock</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Root Access Granted</p>
                    <p className="text-[10px] text-slate-500">Admin-42 authenticated from 192.168.1.1</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-1">1 hour ago</p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                View Detailed Logs
              </button>
            </section>
          </div>
        </div>
      </main>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
        <span className="material-symbols-outlined">terminal</span>
      </button>
    </div>
  )
}
