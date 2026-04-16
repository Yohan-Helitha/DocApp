import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function PatientPrescriptions({ navigate }) {
  return (
    <DashboardLayout navigate={navigate} pageName="Prescriptions">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Prescriptions</h1>
          <p className="text-slate-600 dark:text-slate-400">View and manage your prescribed medications.</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Summary / Stats Banner */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-primary hover:bg-primary/90 transition-colors rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">medication</span> Active Meds
              </h3>
              <p className="text-4xl font-black mb-1">03</p>
              <p className="text-sm opacity-80">Currently prescribed</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Pharmacy Connection</h3>
              <p className="text-xs text-slate-500 mb-4 font-black uppercase tracking-wider">Connected Pharmacies</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                    <span className="material-symbols-outlined text-sm">local_pharmacy</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">CVS Health #4421</p>
                    <p className="text-[10px] text-slate-500">2.4 mi away</p>
                  </div>
                  <button className="text-primary hover:text-primary/70 transition-colors">
                    <span className="material-symbols-outlined text-sm text-[16px]">call</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Prescriptions List */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 dark:text-white">Current Prescriptions</h3>
                  <button className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-[14px]">history</span> View Past
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">vaccines</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">Amoxicillin 500mg</h4>
                            <p className="text-sm text-slate-500 font-medium">Daily morning & night • 7 Days Left</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 rounded-md text-[10px] font-bold uppercase tracking-wider">In Stock</span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-bold uppercase tracking-wider">Antibiotic</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <button className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Reorder</button>
                        <button className="w-full py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
