import React from 'react'

export default function Header({ navigate }){
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg text-white">
              <span className="material-symbols-outlined block text-2xl">health_metrics</span>
            </div>
            <button onClick={()=>navigate('/')} className="text-xl font-extrabold tracking-tight text-primary">SmartHealth AI</button>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold hover:text-primary transition-colors" href="#/">Home</a>
            <a className="text-sm font-semibold hover:text-primary transition-colors" href="#/services">Services</a>
            <a className="text-sm font-semibold hover:text-primary transition-colors" href="#/about">About</a>
            <a className="text-sm font-semibold hover:text-primary transition-colors" href="#/help">Help</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/login')} className="px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 rounded-lg transition-all">Login</button>
            <button onClick={()=>navigate('/register/patient')} className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-opacity-90 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2">Register</button>
          </div>
        </div>
      </div>
    </header>
  )
}
