import React, { useEffect, useState } from 'react';
import adminApi from './adminApi';
import { publishAdminRefresh, subscribeAdminRefresh } from './adminRefresh';

const normalize = (value, fallback = 'pending') => String(value || fallback).toLowerCase();

const statusBadge = (status) => {
  const s = normalize(status);
  if (s === 'approved' || s === 'active') {
    return 'px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black uppercase tracking-widest text-[10px]';
  }
  if (s === 'rejected' || s === 'disabled') {
    return 'px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black uppercase tracking-widest text-[10px]';
  }
  if (s === 'not_created') {
    return 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-black uppercase tracking-widest text-[10px]';
  }
  return 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black uppercase tracking-widest text-[10px]';
};

const statusLabel = (status) => {
  const s = normalize(status);
  if (s === 'active') return 'Approved';
  if (s === 'disabled') return 'Rejected';
  if (s === 'not_created') return 'Not Created';
  if (s === 'pending_verification') return 'Pending';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function DoctorVerification() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | rejected
  const [doctorStats, setDoctorStats] = useState({ approved: 0, rejected: 0 });

  const load = async () => {
    setLoading(true);
    const { status, body } = await adminApi.get('/api/v1/admin/doctors/pending-verification');
    if (status === 200 && body && Array.isArray(body.doctors)) {
      setDoctors(body.doctors);
    } else {
      setDoctors([]);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { status, body } = await adminApi.get('/api/v1/admin/dashboard/metrics');
    if (status === 200 && body && body.doctorReviews) {
      const { doctors_approved, doctors_rejected } = body.doctorReviews;
      setDoctorStats({
        approved: Number(doctors_approved || 0),
        rejected: Number(doctors_rejected || 0)
      });
    }
  };

  useEffect(() => {
    const refresh = async () => {
      await Promise.all([load(), loadStats()]);
    };

    refresh();

    const unsubscribe = subscribeAdminRefresh(refresh);
    return unsubscribe;
  }, []);

  const handleDecision = async (doctorId, approved) => {
    await adminApi.put(`/api/v1/admin/doctors/${doctorId}/verify`, {
      approved,
      step: 'all',
      adminUserId: null
    });
    await Promise.all([load(), loadStats()]);
    publishAdminRefresh();
  };

  const handleLoginDecision = async (doctorId, approved) => {
    await adminApi.put(`/api/v1/admin/doctors/${doctorId}/verify`, {
      approved,
      step: 'login',
      adminUserId: null
    });
    await Promise.all([load(), loadStats()]);
    publishAdminRefresh();
  };

  const handleProfileDecision = async (doctorId, approved) => {
    await adminApi.put(`/api/v1/admin/doctors/${doctorId}/verify`, {
      approved,
      step: 'profile',
      adminUserId: null
    });
    await Promise.all([load(), loadStats()]);
    publishAdminRefresh();
  };

  const handleViewRegistration = async (doctorId) => {
    const { status, blob } = await adminApi.getBlob(`/api/v1/admin/doctors/${doctorId}/license`);
    if (status !== 200 || !blob) return;

    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.assign(url);
  };

  const getLoginStatus = (doc) => normalize(doc.login_verification_status || doc.account_status, 'pending');

  const getProfileStatus = (doc) => normalize(doc.profile_verification_status || doc.verification_status, 'not_created');

  const getRowStatus = (doc) => {
    const login = getLoginStatus(doc);
    const profile = getProfileStatus(doc);

    if (login === 'rejected' || profile === 'rejected') return 'rejected';
    if (login === 'approved' && profile === 'approved') return 'approved';
    return 'pending';
  };

  const query = search.trim().toLowerCase();

  const filteredDoctors = doctors.filter((doc) => {
    const status = getRowStatus(doc);
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (!query) return true;
    const name = (doc.full_name || doc.name || '').toLowerCase();
    const email = (doc.email || '').toLowerCase();
    const spec = (doc.specialization || '').toLowerCase();
    return name.includes(query) || email.includes(query) || spec.includes(query);
  });

  const pendingCount = doctors.filter((d) => getRowStatus(d) === 'pending').length;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h4 className="text-lg font-bold text-slate-900">Doctor Verification</h4>
            <p className="text-xs text-slate-500">Review login and profile verification in two steps.</p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
            {pendingCount} Pending
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Verified Doctors</p>
              <p className="text-xl font-bold text-emerald-900">{doctorStats.approved}</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-500 text-lg font-bold">
              ✓
            </span>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Rejected Doctors</p>
              <p className="text-xl font-bold text-rose-900">{doctorStats.rejected}</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-rose-500 text-lg font-bold">
              !
            </span>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
        <div className="relative w-full sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or specialization..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Doctor Details</th>
              <th className="px-6 py-4">Specialization</th>
              <th className="px-6 py-4">Submitted</th>
              <th className="px-6 py-4">Documents</th>
              <th className="px-6 py-4">Login Verification</th>
              <th className="px-6 py-4">Profile Verification</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={7}>
                  Loading doctors...
                </td>
              </tr>
            )}
            {!loading && filteredDoctors.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={7}>
                  No doctor matches the current filters.
                </td>
              </tr>
            )}
            {!loading && filteredDoctors.map((doc) => (
              <tr key={doc.doctor_id || doc.user_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      {doc.full_name || doc.name || doc.email || 'Unknown doctor'}
                    </span>
                    <span className="text-xs text-slate-500">{doc.email || 'email not provided'}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">ID: {doc.doctor_id || doc.user_id}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{doc.specialization || '-'}</td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-xs text-primary font-semibold">
                  {getLoginStatus(doc) === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => handleViewRegistration(doc.user_id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
                    >
                      <span className="material-symbols-outlined text-sm">description</span>
                      <span>View registration</span>
                    </button>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs">
                  <span className={statusBadge(getLoginStatus(doc))}>{statusLabel(getLoginStatus(doc))}</span>
                </td>
                <td className="px-6 py-4 text-xs">
                  <span className={statusBadge(getProfileStatus(doc))}>{statusLabel(getProfileStatus(doc))}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    {(getLoginStatus(doc) === 'pending' || getLoginStatus(doc) === 'rejected') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleLoginDecision(doc.user_id, true)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                          Approve Login
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoginDecision(doc.user_id, false)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"
                        >
                          Reject Login
                        </button>
                      </>
                    )}

                    {(getLoginStatus(doc) === 'approved' && doc.doctor_id) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleProfileDecision(doc.user_id, true)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                          Approve Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProfileDecision(doc.user_id, false)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"
                        >
                          Reject Profile
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
