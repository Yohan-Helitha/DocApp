import React, { useEffect, useState } from 'react';
import adminApi from './adminApi';

const formatTimeAgo = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
};

const getCategory = (log) => {
  const entity = (log.target_entity || '').toLowerCase();
  const type = (log.action_type || '').toLowerCase();
  if (entity === 'user' || type.includes('user')) return 'users';
  if (entity === 'doctor' || type.includes('doctor')) return 'doctors';
  if (entity === 'transaction' || type.includes('transaction')) return 'transactions';
  return 'other';
};

const getActionLabel = (actionType) => {
  const type = (actionType || '').toLowerCase();
  if (type === 'user_status_change') return 'User Update';
  if (type === 'verify_doctor') return 'Doctor Verification';
  if (type.includes('transaction')) return 'Transaction Action';
  return actionType || 'Action';
};

const categoryColors = {
  users: 'bg-sky-100 text-sky-700 border-sky-200',
  doctors: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  transactions: 'bg-amber-100 text-amber-700 border-amber-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200'
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all | users | doctors | transactions

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { status, body } = await adminApi.get('/api/v1/admin/audit-logs');
      if (status === 200 && body && Array.isArray(body.logs)) {
        setLogs(body.logs);
      } else {
        setLogs([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (activeTab === 'all') return true;
    return getCategory(log) === activeTab;
  });

  const renderTabButton = (id, label) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
        activeTab === id
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900">Audit Logs</h4>
          <p className="text-xs text-slate-500">Readable history of key admin actions in the platform.</p>
        </div>
        <div className="text-[11px] text-slate-500 whitespace-nowrap">
          Showing {filteredLogs.length} of {logs.length} events
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mr-1">View</span>
          {renderTabButton('all', 'All')}
          {renderTabButton('users', 'Users')}
          {renderTabButton('doctors', 'Doctors')}
          {renderTabButton('transactions', 'Transactions')}
        </div>
      </div>

      <div className="px-6 py-4">
        {loading && (
          <p className="text-sm text-slate-500">Loading audit logs...</p>
        )}

        {!loading && filteredLogs.length === 0 && (
          <p className="text-sm text-slate-500">No audit logs match this filter.</p>
        )}

        {!loading && filteredLogs.length > 0 && (
          <ul className="space-y-3">
            {filteredLogs.map((log) => {
              const cat = getCategory(log);
              const colorClasses = categoryColors[cat] || categoryColors.other;
              const adminLabel = log.admin_user_id
                ? `Admin ${String(log.admin_user_id).slice(0, 8)}`
                : 'System';

              return (
                <li
                  key={log.action_id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${colorClasses}`}
                    >
                      {cat === 'users' && 'U'}
                      {cat === 'doctors' && 'D'}
                      {cat === 'transactions' && 'T'}
                      {cat === 'other' && '?'}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">{adminLabel}</span>{' '}
                        <span className="text-slate-500">performed</span>{' '}
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                          {getActionLabel(log.action_type)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-600">Target:</span>{' '}
                        {log.target_entity || 'Unknown'}{' '}
                        {log.target_entity_id && (
                          <span className="font-mono text-[10px] text-slate-400">{log.target_entity_id}</span>
                        )}
                      </div>
                      {log.action_note && (
                        <div className="text-[11px] text-slate-600">{log.action_note}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 whitespace-nowrap">{formatTimeAgo(log.created_at)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
