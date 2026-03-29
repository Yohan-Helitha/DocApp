import React, { useEffect, useState } from 'react';
import adminApi from './adminApi';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <h4 className="text-lg font-bold text-slate-900">Audit Logs</h4>
        <p className="text-xs text-slate-500">History of admin actions taken in the system.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">When</th>
              <th className="px-6 py-4">Admin</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Target</th>
              <th className="px-6 py-4">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={5}>
                  Loading audit logs...
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={5}>
                  No audit logs found.
                </td>
              </tr>
            )}
            {!loading && logs.map((log) => (
              <tr key={log.action_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-xs text-slate-500">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{log.admin_user_id || '-'}</td>
                <td className="px-6 py-4 text-xs font-bold uppercase text-slate-700">{log.action_type}</td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {log.target_entity || '-'} {log.target_entity_id || ''}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">{log.action_note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
