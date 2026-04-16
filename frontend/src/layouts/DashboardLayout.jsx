import React from 'react';

export default function DashboardLayout({ children, navigate, pageName }) {
  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      } catch (e) {}
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    localStorage.removeItem('patientId');
    if (navigate) navigate('/login');
    else window.location.hash = '/login';
  };

  const goTo = (path) => {
    // Check if profile completion is required
    const requiresCompletion = localStorage.getItem('requiresProfileCompletion') === 'true';
    
    // Block navigation away from profile page if profile completion is required
    if (requiresCompletion && path !== '/patient/profile') {
      alert('Please complete your profile information before navigating to other pages.');
      return;
    }
    
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  return (
    <div className="bg-background text-on-background antialiased">
      <div className="flex flex-col md:flex-row">
        {/* Side Navigation */}
        <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 bg-slate-50 p-4 z-40">
          <div className="mb-10 px-4 py-4">
            <h1 className="text-2xl font-black text-[#0b9385] tracking-tighter uppercase">
              DASHBOARD
            </h1>
          </div>
          <nav className="flex-1 space-y-1">
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); goTo('/success/patient'); }}>
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-semibold text-sm">Overview</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); goTo('/appointments'); }}>
              <span className="material-symbols-outlined">event</span>
              <span className="font-semibold text-sm">Appointments</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); goTo('/doctors'); }}>
              <span className="material-symbols-outlined">person_search</span>
              <span className="font-semibold text-sm">Search Doctors</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); goTo('/patient/medical-reports'); }}>
              <span className="material-symbols-outlined">description</span>
              <span className="font-semibold text-sm">Medical Records</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); goTo('/patient/history'); }}>
              <span className="material-symbols-outlined">history</span>
              <span className="font-semibold text-sm">Medical History</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); goTo('/patient/profile'); }}>
              <span className="material-symbols-outlined">account_circle</span>
              <span className="font-semibold text-sm">Patient Profile</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); goTo('/notifications'); }}>
              <span className="material-symbols-outlined">notifications</span>
              <span className="font-semibold text-sm">Notifications</span>
            </a>
          </nav>
          <div className="mt-auto space-y-1 pt-4 border-t border-slate-200/50">
            <button className="w-full bg-primary text-on-primary rounded-xl py-3 px-4 mb-4 font-bold text-sm shadow-sm active:scale-95 transition-transform" onClick={() => goTo('/symptom-checker')}>
              Start AI Consultation
            </button>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); logout(); }}>
              <span className="material-symbols-outlined">logout</span>
              <span className="font-semibold text-sm">Logout</span>
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
