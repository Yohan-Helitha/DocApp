import React from 'react'
import Api from '../../core/api'

export default function SuccessDoctor({ navigate }){
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
    <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 flex flex-col p-4 z-40">
        <div className="mb-10 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" data-icon="clinical_notes">clinical_notes</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0b9385]">Teal Obsidian</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clinical Curator</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 transition-all duration-200" href="#">
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
            <span className="material-symbols-outlined" data-icon="event">event</span>
            <span className="font-semibold text-sm">Appointments</span>
          </a>
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
            <span className="material-symbols-outlined" data-icon="description">description</span>
            <span className="font-semibold text-sm">Medical Records</span>
          </a>
          <button
            type="button"
            onClick={() => (navigate ? navigate('/telemedicine') : (window.location.hash = '/telemedicine'))}
            className="w-full text-left text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200"
          >
            <span className="material-symbols-outlined" data-icon="video_chat">video_chat</span>
            <span className="font-semibold text-sm">Telemedicine</span>
          </button>
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
            <span className="material-symbols-outlined" data-icon="forum">forum</span>
            <span className="font-semibold text-sm">Messages</span>
          </a>
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200" href="#">
            <span className="material-symbols-outlined" data-icon="insert_chart">insert_chart</span>
            <span className="font-semibold text-sm">Analytics</span>
          </a>
        </nav>
        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50">
          <button className="w-full bg-primary text-on-primary rounded-xl py-3 px-4 font-bold text-sm shadow-sm active:scale-95 transition-transform mb-4">
            Start AI Consultation
          </button>
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all" href="#">
            <span className="material-symbols-outlined" data-icon="help">help</span>
            <span className="font-semibold text-sm">Help Center</span>
          </a>
          <button onClick={logout} className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all text-error w-full text-left">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8 min-h-screen">
        <header className="flex justify-between items-end mb-12">
          <div>
            <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary mb-2 block">Monday, October 24</span>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome, Dr. Aris Thorne</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3 overflow-hidden">
              <img alt="Team member" className="inline-block h-10 w-10 rounded-full ring-4 ring-background" data-alt="Portrait of a medical staff member" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOXLbLJSVFCJsliTR77pfQSU6-G-1gaRBwzqKmdUhO_Cu8BVNY7UikRq1elzJ1QMXVt1_fXVmSO3sRgFCuJj0o5op5E1Lydi_uZHVJTWkyNL8YWxN4r7nQIQyFPllnY59_nBsEMnZ1L0cBO_Gn6B0hfONBctiffTgQWQE_kYWEz_oPMj-oOlEEa98zrUjWWAoWtNuCaLXEu4QYob4aPiNeCXt7bmJ6e1EDkZzupgDuC_0rEd6xogawze4GpWgfNl_AKXviLLyZVoE"/>
              <img alt="Team member" className="inline-block h-10 w-10 rounded-full ring-4 ring-background" data-alt="Portrait of a smiling nurse" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5yXYBzSfQSnHfYKL79JUUeIxOFoME0G1-7wcPIB2zZtVZtcu8G6Hznwz8zxlxJf0BjTqDtDXb-v1hl1rsIjsFdk1YyD6KPnoeyYGzpUPkYGjHYmSdMsCHr9121cs9nD7O7GCgdyWevagvMatoYly_xvIttzJPa1fTMOHCmwlFv1ITnuhSe1jo359MYRoIhn1fUf_LiKg_gPJydGIVvTm1wkFQOJlGwiu6TrvA0zPxXxxQMhq91yH4PzdQbl-NXP51wIhSVt1AcEo"/>
              <div className="flex items-center justify-center h-10 w-10 rounded-full ring-4 ring-background bg-surface-container text-xs font-bold text-on-surface">+4</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-200"></div>
            <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-background"></span>
            </button>
            <div className="flex items-center gap-3">
              <img alt="Dr. Thorne" className="w-10 h-10 rounded-xl object-cover" data-alt="Portrait of a professional doctor" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCoDYUje20pDs6Uter4Sgl8FH9o5nJVL7JZABRQwu4nhKK3KdlEMu1TRO5LEwMMce5QhSVs2hhJ_qkzzTrDiWtAqtqpgIpJYZQo8MZeM4Q5PStQe3lswb6iKnFgsmnbxA3EerxvX4D7AGcgJeJdGizw5O78MEnKtVlHbFWtHHqKlrM8U3Ns4xJ1CSg4I-hFCXcYPPNYKJ4jQBC7bwpN1L1YPY8dTJ-QDyJfxS1RGmDsK64QbwyR1RigC1lHu8AIG7KElaCs4M495gE"/>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 lg:col-span-8">
            <div className="bg-primary-container/30 backdrop-blur-md rounded-2xl p-8 flex items-center justify-between border border-primary/10 shadow-lg mb-8 relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex gap-8 items-center">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-on-primary shadow-xl">
                  <span className="material-symbols-outlined" style={{fontSize:40}}>videocam</span>
                </div>
                <div>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary mb-2">LIVE NOW</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Marcus Sterling</h3>
                  <p className="text-slate-500 font-medium">Post-Op Consultation • Room 402</p>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="text-right mr-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Duration</p>
                  <p className="text-lg font-bold text-slate-900">14:02 / 30:00</p>
                </div>
                <button className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all">
                  Join Session
                  <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" data-icon="calendar_today">calendar_today</span>
                    Today's Schedule
                  </h3>
                  <button className="text-primary font-bold text-xs uppercase tracking-wider hover:underline">View All</button>
                </div>
                <div className="space-y-6">
                  <div className="flex gap-4 group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-slate-900">09:00</span>
                      <div className="w-0.5 flex-1 bg-slate-100 my-1 group-last:hidden"></div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 flex-1 group-hover:bg-slate-100 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-slate-900">Elena Rodriguez</p>
                        <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">Check-up</span>
                      </div>
                      <p className="text-xs text-slate-500">In-person • 30 mins</p>
                    </div>
                  </div>

                  <div className="flex gap-4 group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-slate-900">10:30</span>
                      <div className="w-0.5 flex-1 bg-slate-100 my-1 group-last:hidden"></div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 flex-1 group-hover:bg-slate-100 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-slate-900">Jordan Vance</p>
                        <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Telehealth</span>
                      </div>
                      <p className="text-xs text-slate-500">Video Call • 15 mins</p>
                    </div>
                  </div>

                  <div className="flex gap-4 group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-slate-400">11:15</span>
                      <div className="w-0.5 flex-1 bg-slate-100 my-1 group-last:hidden"></div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl p-4 flex-1 group-hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-slate-900">Sarah Chen</p>
                        <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Urgent</span>
                      </div>
                      <p className="text-xs text-slate-500">In-person • 45 mins</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" data-icon="pending_actions">pending_actions</span>
                    Pending Requests
                  </h3>
                  <span className="bg-error text-on-primary text-[10px] font-bold px-2 py-1 rounded-full">3 New</span>
                </div>
                <div className="space-y-4">
                  <div className="border border-slate-100 rounded-2xl p-5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <img alt="Patient" className="w-10 h-10 rounded-full object-cover" data-alt="Portrait of a young woman" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbctL0pKfBb7cphPpmgUxw6b4JadnX6tUCTUyTlzCHriLUXd6dabpS3IVIiYYF3OF1S3ix5XzTPVvDxS7Zt81hU2XaP7WgMxALzHgLxl5C_V9fRfbkwlRByIu26-aZ2ZrsOv5U3f1-RR7P_xn0VMz8282CVSxrOZMvaYiUtBr_RUjAmRO3xS8VNsBp2CHQ2qCGhzWbeXDoiHYiGsPvQQTnCWz5rojMsb0fs3Bj-b4sUEZCXwbEewsp8H9Aqr57KUZaSqRKtak5cgI"/>
                      <div>
                        <p className="font-bold text-sm text-slate-900">Alicia Keyser</p>
                        <p className="text-[11px] text-slate-500 font-medium">Requested: Tue, 2:00 PM</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="text-[11px] font-bold py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors">Accept</button>
                      <button className="text-[11px] font-bold py-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors">Reschedule</button>
                      <button className="text-[11px] font-bold py-2 bg-error/5 text-error rounded-lg hover:bg-error hover:text-white transition-colors">Reject</button>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <img alt="Patient" className="w-10 h-10 rounded-full object-cover" data-alt="Portrait of a young man" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCItj20ufJSBw0qJM5anPCCaqwp2RcS4gBrCPgOnok-CDkfwkFzTlGi69YE_7awqjEZevQIp-1QSM_GtGLyzJw8Oaa1yezmzlissrWrWBwOZ5e1g286B4ET7z5wohHRcDm4jQtU0_6Ezl0vs0vkkVdonW8PcFoRB_TY-Z64QIJ92wsDfZBoyvwxgfPnyBdp_YrutH4-4GOrD9HGyJiJyB4hUWVLYrWr5Yipg6rVnbR83IW6nGtvrNRU3V-TpfCJBEO4ENXMczgTYLA"/>
                      <div>
                        <p className="font-bold text-sm text-slate-900">Robert D. Miles</p>
                        <p className="text-[11px] text-slate-500 font-medium">Requested: Wed, 10:00 AM</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="text-[11px] font-bold py-2 bg-primary/10 text-primary rounded-lg">Accept</button>
                      <button className="text-[11px] font-bold py-2 bg-slate-50 text-slate-500 rounded-lg">Reschedule</button>
                      <button className="text-[11px] font-bold py-2 bg-error/5 text-error rounded-lg">Reject</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" data-icon="event_available">event_available</span>
                Weekly Snapshot
              </h3>
              <div className="flex justify-between items-center mb-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mon</p>
                  <div className="w-10 h-16 bg-primary rounded-full flex flex-col items-center justify-end pb-2">
                    <div className="w-full bg-primary-container h-4/5 rounded-full mb-1"></div>
                    <span className="text-[10px] font-bold text-on-primary">85%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-primary">Tue</p>
                  <div className="w-10 h-16 bg-primary rounded-full flex flex-col items-center justify-end pb-2 ring-2 ring-primary ring-offset-2">
                    <div className="w-full bg-primary-container h-full rounded-full mb-1"></div>
                    <span className="text-[10px] font-bold text-on-primary">100%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Wed</p>
                  <div className="w-10 h-16 bg-slate-100 rounded-full flex flex-col items-center justify-end pb-2">
                    <div className="w-full bg-slate-200 h-1/2 rounded-full mb-1"></div>
                    <span className="text-[10px] font-bold text-slate-400">45%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Thu</p>
                  <div className="w-10 h-16 bg-primary rounded-full flex flex-col items-center justify-end pb-2">
                    <div className="w-full bg-primary-container h-3/4 rounded-full mb-1"></div>
                    <span className="text-[10px] font-bold text-on-primary">70%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fri</p>
                  <div className="w-10 h-16 bg-primary rounded-full flex flex-col items-center justify-end pb-2">
                    <div className="w-full bg-primary-container h-2/3 rounded-full mb-1"></div>
                    <span className="text-[10px] font-bold text-on-primary">60%</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-600 mb-1">Tomorrow's capacity is reached.</p>
                <p className="text-xs text-slate-400">3 priority slots remained unallocated.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" data-icon="insights">insights</span>
                AI Report Insights
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-2 h-12 bg-error rounded-full shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Sarah Chen</p>
                    <p className="text-xs text-slate-500 mb-2">Lab results show elevated WBC count. Immediate review recommended.</p>
                    <button className="text-xs font-bold text-primary flex items-center gap-1">Open Report <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span></button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-2 h-12 bg-primary rounded-full shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Elena Rodriguez</p>
                    <p className="text-xs text-slate-500 mb-2">AI Summary: Recovery progressing 15% faster than model projections.</p>
                    <button className="text-xs font-bold text-primary flex items-center gap-1">View Timeline <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-on-primary rounded-2xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10">
                <span className="material-symbols-outlined" style={{fontSize:120}}>notifications_active</span>
              </div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">System Feed</h3>
              <div className="space-y-4 relative z-10">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-fixed-dim">check_circle</span>
                  <p className="text-xs leading-relaxed"><span className="font-bold">System Update:</span> AI Diagnostic Model v4.2 is now active in your workflow.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-error">cancel</span>
                  <p className="text-xs leading-relaxed"><span className="font-bold">Cancellation:</span> Patient David Miller cancelled tomorrow at 2:00 PM.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="fixed bottom-8 right-8 z-50">
        <button className="bg-primary text-on-primary w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{fontSize:32}}>emergency_share</span>
        </button>
      </div>
    </div>
  )
}
