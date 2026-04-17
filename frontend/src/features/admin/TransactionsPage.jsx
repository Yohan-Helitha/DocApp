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
  const [stats, setStats] = useState({ totalVolume: 0, successful: 0, pending: 0 });
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState(null);

  const openInvoice = (tx) => setSelectedInvoiceTx(tx);
  const closeInvoice = () => setSelectedInvoiceTx(null);

  const getStatusLabel = (tx) => {
    const statusRaw = String(tx?.status || '').trim().toLowerCase();
    if (statusRaw === 'completed' || statusRaw === 'complete') return 'PAID';
    if (statusRaw === 'failed') return 'FAILED';
    if (statusRaw === 'pending') return 'PENDING';
    return (statusRaw || 'UNKNOWN').toUpperCase();
  };

  const getStatusPillClass = (tx) => {
    const statusRaw = String(tx?.status || '').trim().toLowerCase();
    if (statusRaw === 'completed' || statusRaw === 'complete') return 'bg-slate-900 text-white';
    if (statusRaw === 'failed') return 'bg-rose-600 text-white';
    if (statusRaw === 'pending') return 'bg-amber-600 text-white';
    return 'bg-slate-600 text-white';
  };

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
        const pendingCount = body.transactions.filter((tx) => {
          const s = (tx.status || '').toLowerCase();
          return s === 'pending';
        }).length;
        setStats((prev) => ({
          ...prev,
          successful: successCount,
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
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      <div className="px-6 pt-3 pb-4 border-b border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
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
              <th className="px-6 py-4">Patient Email</th>
              <th className="px-6 py-4">Doctor Email</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Invoice</th>
              <th className="px-6 py-4">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={7}>
                  Loading transactions...
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={7}>
                  No transactions match this filter.
                </td>
              </tr>
            )}
            {!loading && filteredRows.map((tx) => {
              return (
                <React.Fragment key={tx.record_id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-700 font-semibold break-all">
                      {tx.patient_email || '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-semibold break-all">
                      {tx.doctor_email || '-'}
                    </td>
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
                      <button
                        type="button"
                        onClick={() => openInvoice(tx)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm hover:bg-slate-100 transition-colors"
                        title="View invoice"
                      >
                        <span className="material-symbols-outlined text-slate-700">visibility</span>
                        View
                      </button>
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
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedInvoiceTx && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeInvoice();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-base font-black text-slate-900">Invoice</p>
                <p className="text-xs text-slate-500 mt-1 break-all">
                  Transaction: <span className="font-mono">{selectedInvoiceTx.transaction_id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeInvoice}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-slate-700">close</span>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-black text-slate-900">Payment</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${getStatusPillClass(selectedInvoiceTx)}`}>
                    {getStatusLabel(selectedInvoiceTx)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="text-sm">
                    <p className="text-slate-500 text-xs font-bold">Amount</p>
                    <p className="text-slate-900 font-bold">
                      {selectedInvoiceTx.currency || 'LKR'} {formatCurrency(selectedInvoiceTx.amount)}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-500 text-xs font-bold">Provider</p>
                    <p className="text-slate-900 font-bold">{selectedInvoiceTx.provider || '-'}</p>
                  </div>

                  <div className="text-sm col-span-2">
                    <p className="text-slate-500 text-xs font-bold">Appointment ID</p>
                    <p className="text-slate-900 font-bold break-all">{selectedInvoiceTx.appointment_id || '-'}</p>
                  </div>

                  <div className="text-sm">
                    <p className="text-slate-500 text-xs font-bold">Doctor email</p>
                    <p className="text-slate-900 font-bold break-all">{selectedInvoiceTx.doctor_email || '-'}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-500 text-xs font-bold">Patient email</p>
                    <p className="text-slate-900 font-bold break-all">{selectedInvoiceTx.patient_email || '-'}</p>
                  </div>

                  <div className="text-sm col-span-2">
                    <p className="text-slate-500 text-xs font-bold">Date</p>
                    <p className="text-slate-900 font-bold">{formatDateTime(selectedInvoiceTx.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
