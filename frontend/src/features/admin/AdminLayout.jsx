import React, { useState } from 'react';
import DoctorVerification from './DoctorVerification';
import TransactionsPage from './TransactionsPage';
import AuditLogsPage from './AuditLogsPage';

export default function AdminLayout({ onLogout }) {
  const [active, setActive] = useState('doctors');

  let Content = DoctorVerification;
  if (active === 'transactions') Content = TransactionsPage;
  else if (active === 'logs') Content = AuditLogsPage;

  return (
    <div className="min-h-screen bg-slate-50 text-on-background antialiased">
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 z-40">
        <div className="flex flex-col h-full p-4">
          <div className="mb-10 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-[#0b9385] leading-none">DocApp Admin</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Operations Console</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <button
              type="button"
              onClick={() => setActive('doctors')}
              className={`w-full text-left rounded-lg px-4 py-3 flex items-center gap-3 font-semibold transition-all duration-200 ${
                active === 'doctors'
                  ? 'bg-[#0b9385]/10 text-[#0b9385] hover:translate-x-1'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined">medical_information</span>
              <span>Doctor Verification</span>
            </button>
            <button
              type="button"
              onClick={() => setActive('transactions')}
              className={`w-full text-left rounded-lg px-4 py-3 flex items-center gap-3 font-semibold transition-all duration-200 ${
                active === 'transactions'
                  ? 'bg-[#0b9385]/10 text-[#0b9385] hover:translate-x-1'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined">account_balance</span>
              <span>Transactions</span>
            </button>
            <button
              type="button"
              onClick={() => setActive('logs')}
              className={`w-full text-left rounded-lg px-4 py-3 flex items-center gap-3 font-semibold transition-all duration-200 ${
                active === 'logs'
                  ? 'bg-[#0b9385]/10 text-[#0b9385] hover:translate-x-1'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined">history</span>
              <span>Audit Logs</span>
            </button>
          </nav>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1 px-2 mt-4">
            <button
              type="button"
              onClick={onLogout}
              className="text-slate-500 dark:text-slate-400 px-4 py-2 flex items-center gap-3 font-semibold text-xs hover:text-error transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen flex flex-col">
        {/* Admin top bar */}
        <div className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
            <span>Admin Console</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">SmartHealth AI</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="hidden sm:inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-emerald-500">shield_lock</span>
              <span className="font-semibold">Admin</span>
            </span>
          </div>
        </div>

        <div className="p-8 flex-1">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h2>
              <p className="text-slate-500 font-medium">Manage doctor verification, transactions, and audit logs.</p>
            </div>
          </header>

          <Content />
        </div>
      </main>
    </div>
  );
}
