import React from 'react'

export default function Home(){
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl font-black text-[#0F172A] leading-tight mb-6">
              AI-Powered Healthcare at <span className="text-primary">Your Fingertips</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto lg:mx-0">
              Experience the future of medicine with smart scheduling, instant telemedicine, and secure digital health records. Personalized care powered by advanced intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="px-8 py-4 bg-primary text-white font-bold rounded-xl text-lg hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">Book Appointment</button>
              <button className="px-8 py-4 bg-dark text-white border border-dark font-bold rounded-xl text-lg hover:bg-dark/90 transition-colors">Learn More</button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-xl">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-white dark:border-slate-800">
              <img alt="Healthcare professional using a tablet" className="w-full h-auto object-cover aspect-video lg:aspect-square" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBW8GiJ82SuEMyYIJll06WRXuqfoYPXPRGDFIsrGE3fsMRqsP7hnHOzFEKxXtVTyGf7YlFtzTONX45P28zxYFcte7Ihqsi_GF-a_bSXq0EL1B_Z5FQgtRkEFcByaWcLkcmXNHGKPBHdB0fbi09TvwjjE63GdISU1eYZXJ8A9BwMy_-Z4KN80WXihNU8i_wRnRBZcTBGPoYxVPmB1xsGP0garSSqCIxk0_V-QulN1xwenRtiAVSjqB85XSMQq-7LXUD3y6JWDXAbqZQ" />
              <div className="absolute bottom-4 right-4 bg-dark/90 backdrop-blur p-4 rounded-xl shadow-lg flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/80 uppercase">System Status</p>
                  <p className="text-sm font-bold text-white">AI Diagnostics Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Our Services</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-white">Advanced Digital Care</h3>
            <p className="mt-4 text-slate-100 max-w-2xl mx-auto">We leverage cutting-edge AI to streamline your healthcare journey and provide better outcomes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-background-light dark:bg-slate-900 hover:border-primary/50 transition-colors group">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">calendar_month</span>
              </div>
              <h4 className="text-xl font-bold mb-3">AI Scheduling</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Smart appointment booking that optimizes schedules based on urgency and specialist availability.</p>
            </div>
            <div className="p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-background-light dark:bg-slate-900 hover:border-primary/50 transition-colors group">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">videocam</span>
              </div>
              <h4 className="text-xl font-bold mb-3">Telemedicine</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Connect with board-certified doctors instantly via high-definition video from the comfort of your home.</p>
            </div>
            <div className="p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-background-light dark:bg-slate-900 hover:border-primary/50 transition-colors group">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">folder_shared</span>
              </div>
              <h4 className="text-xl font-bold mb-3">Digital Records</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Secure, blockchain-encrypted access to your entire medical history, accessible anytime, anywhere.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary">What Our Patients Say</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm">
              <div className="flex text-yellow-400 mb-4">
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 italic mb-6">"The AI scheduling saved me hours of phone calls. I got an appointment with a specialist within minutes!"</p>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-slate-200"></div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Sarah Jenkins</p>
                  <p className="text-xs text-slate-500">Business Analyst</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm">
              <div className="flex text-yellow-400 mb-4">
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 italic mb-6">"Telemedicine on this platform is incredibly smooth. The video quality is great and my doctor was very attentive."</p>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-slate-200"></div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Michael Chen</p>
                  <p className="text-xs text-slate-500">Software Engineer</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm md:hidden lg:block">
              <div className="flex text-yellow-400 mb-4">
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 italic mb-6">"Having all my records in one place made my second opinion consultation so much easier. Highly recommended."</p>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-slate-200"></div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Elena Rodriguez</p>
                  <p className="text-xs text-slate-500">Teacher</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
