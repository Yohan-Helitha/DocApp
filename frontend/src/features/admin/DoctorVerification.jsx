import React, { useEffect, useState } from 'react';
import adminApi from './adminApi';

export default function DoctorVerification() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  const handleDecision = async (doctorId, approved) => {
    await adminApi.put(`/api/v1/admin/doctors/${doctorId}/verify`, { approved, adminUserId: null });
    load();
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h4 className="text-lg font-bold text-slate-900">Doctor Verification</h4>
          <p className="text-xs text-slate-500">Review and approve pending doctor registrations.</p>
        </div>
        <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
          {doctors.length} Pending
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Doctor Details</th>
              <th className="px-6 py-4">Specialization</th>
              <th className="px-6 py-4">Submitted</th>
              <th className="px-6 py-4">Documents</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={5}>
                  Loading pending doctors...
                </td>
              </tr>
            )}
            {!loading && doctors.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-slate-500" colSpan={5}>
                  No pending doctor verifications.
                </td>
              </tr>
            )}
            {!loading && doctors.map((doc) => (
              <tr key={doc.doctor_id || doc.user_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      {doc.name || doc.email || `Doctor #${doc.doctor_id || doc.user_id}`}
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
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>View registration</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => handleDecision(doc.doctor_id || doc.user_id, true)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(doc.doctor_id || doc.user_id, false)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
