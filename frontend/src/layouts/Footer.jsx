import React from 'react'

export default function Footer(){
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary p-1.5 rounded-lg text-white">
                <span className="material-symbols-outlined block text-2xl">health_metrics</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-primary">SmartHealth AI</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
              Redefining healthcare through artificial intelligence and patient-centric technology.
            </p>
            <div className="flex gap-4">
              <a className="text-slate-400 hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">language</span></a>
              <a className="text-slate-400 hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">mail</span></a>
              <a className="text-slate-400 hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">call</span></a>
            </div>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white">Platform</h5>
            <ul className="space-y-4">
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">Telemedicine</a></li>
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">AI Diagnostics</a></li>
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">Scheduling</a></li>
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">Mobile App</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white">Company</h5>
            <ul className="space-y-4">
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">About Us</a></li>
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">Careers</a></li>
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">Blog</a></li>
              <li><a className="text-slate-500 dark:text-slate-400 text-sm hover:text-primary transition-colors" href="#">Press</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white">Contact</h5>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-500 dark:text-slate-400 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                <span>123 Medical Plaza,<br/>Innovation City, 90210</span>
              </li>
              <li className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">phone</span>
                <span>+1 (555) 000-1234</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">© 2024 SmartHealth AI. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-400">
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
