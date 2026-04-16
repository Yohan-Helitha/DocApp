import React, { useEffect, useState } from 'react';
import adminApi from './adminApi';

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';

  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return `${datePart} ${timePart}`;
};

const formatCurrency = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function TransactionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ totalVolume: 0, successful: 0, partial: 0, pending: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { status, body } = await adminApi.get('/api/v1/admin/transactions');
      if (status === 200 && body && Array.isArray(body.transactions)) {
        setRows(body.transactions);
        const successCount = body.transactions.filter((tx) => {
          const s = (tx.status || '').toLowerCase();
          return s === 'completed' || s === 'complete';
        }).length;
        const partialCount = body.transactions.filter((tx) => {
          const s = (tx.status || '').toLowerCase();
          return (
            s === 'partial' ||
            s === 'half' ||
            s === 'half_paid' ||
            s === 'partially_paid'
          );
        }).length;
        const pendingCount = body.transactions.filter((tx) => {
          const s = (tx.status || '').toLowerCase();
          return s === 'pending';
        }).length;
        setStats((prev) => ({
          ...prev,
          successful: successCount,
          partial: partialCount,
          pending: pendingCount
        }));
      } else {
        setRows([]);
      }
      setLoading(false);

      const metricsRes = await adminApi.get('/api/v1/admin/dashboard/metrics');
      if (metricsRes.status === 200 && metricsRes.body && metricsRes.body.financials) {
        const { total_amount } = metricsRes.body.financials;
        setStats((prev) => ({ ...prev, totalVolume: Number(total_amount || 0) }));
      }
    };
    load();
  }, []);

  const filteredRows = rows.filter((tx) => {
    if (statusFilter === 'all') return true;
    const status = (tx.status || '').toLowerCase();
    switch (statusFilter) {
      case 'pending':
        return status === 'pending';
      case 'completed':
        return status === 'completed' || status === 'complete';
      case 'half':
        return (
          status === 'partial' ||
          status === 'half' ||
          status === 'half_paid' ||
          status === 'partially_paid'
        );
      case 'failed':
        return status === 'failed';
      default:
        return true;
    }
  });

  return (
    <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900">Transactions</h4>
          <p className="text-xs text-slate-500">Read-only view of monitored financial transactions.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium uppercase tracking-wide">Filter</span>
          <select
            className="border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="half">Half (Partial)</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      <div className="px-6 pt-3 pb-4 border-b border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wide">Total Volume</p>
              <p className="text-2xl font-bold text-slate-900">LKR {formatCurrency(stats.totalVolume)}</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky-500 text-lg font-bold">
              ✓
            </span>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Successful</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.successful}</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-500 text-lg font-bold">
              ✓
            </span>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Partial</p>
              <p className="text-2xl font-bold text-amber-900">{stats.partial}</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-amber-500 text-lg font-bold">
              ≈
            </span>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-amber-500 text-lg font-bold">
              …
            </span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Transaction</th>
              <th className="px-6 py-4">Appointment</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={6}>
                  Loading transactions...
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={6}>
                  No transactions match this filter.
                </td>
              </tr>
            )}
            {!loading && filteredRows.map((tx) => (
              <tr key={tx.record_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-slate-700">{tx.transaction_id}</td>
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{tx.appointment_id || '-'}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{formatDateTime(tx.created_at)}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  {tx.amount} {tx.currency}
                </td>
                <td className="px-6 py-4 text-xs">
                  {(() => {
                    const status = (tx.status || '').toLowerCase();
                    if (status === 'completed' || status === 'complete') {
                      return (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black uppercase tracking-widest text-[10px]">
                          Completed
                        </span>
                      );
                    }
                    if (
                      status === 'partial' ||
                      status === 'half' ||
                      status === 'half_paid' ||
                      status === 'partially_paid'
                    ) {
                      return (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black uppercase tracking-widest text-[10px]">
                          Half / Partial
                        </span>
                      );
                    }
                    if (status === 'failed') {
                      return (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black uppercase tracking-widest text-[10px]">
                          Failed
                        </span>
                      );
                    }
                    if (status === 'pending') {
                      return (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black uppercase tracking-widest text-[10px]">
                          Pending
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px]">
                        {tx.status || 'Unknown'}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 text-xs">
                  {tx.flagged ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Flagged
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
