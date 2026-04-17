import React, { useState, useEffect } from "react";
import Api from "../core/api";
import DashboardLayout from "../layouts/DashboardLayout";

const SPECIALIZATIONS = [
  "Cardiology",
  "Neurology",
  "General Practice",
  "Pediatrics",
  "Dermatology",
  "Orthopedics",
  "Psychiatry",
  "Ophthalmology",
  "Oncology",
  "Radiology",
  "Gynecology",
  "Urology",
  "ENT",
  "Gastroenterology",
  "Endocrinology",
];

export default function BrowseDoctors({ navigate }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [specFilter, setSpecFilter] = useState("");
  const [error, setError] = useState("");

  const token = sessionStorage.getItem("accessToken");

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  const fetchDoctors = async (name, spec) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (spec) params.set("specialization", spec);
      const query = params.toString();
      const r = await Api.get(
        `/api/v1/doctors${query ? "?" + query : ""}`,
        token,
      );
      if (r.status === 200) {
        setDoctors(r.body?.doctors || []);
      } else {
        setError("Failed to load doctors. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!token) {
      goTo("/login");
      return;
    }
    fetchDoctors("", "");
  }, []);

  const search = (e) => {
    e.preventDefault();
    fetchDoctors(nameFilter, specFilter);
  };

  return (
    <DashboardLayout navigate={navigate} pageName="Search Doctors">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Find a Doctor</h1>
            <p className="text-slate-600">
              Search and browse doctors by name or specialization.
            </p>
          </div>
        </div>
        {/* Search form */}
        <form
          onSubmit={search}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Doctor Name
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  search
                </span>
                <input
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Specialization
              </label>
              <select
                value={specFilter}
                onChange={(e) => setSpecFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">All Specializations</option>
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-opacity-90 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin">
              progress_activity
            </span>
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-red-400 text-5xl block mb-3">
              error
            </span>
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={() => fetchDoctors(nameFilter, specFilter)}
              className="mt-4 px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && doctors.length === 0 && (
          <div className="text-center py-24 text-slate-400">
            <span className="material-symbols-outlined text-6xl block mb-4">
              person_search
            </span>
            <p className="font-medium text-lg">No doctors found.</p>
            <p className="text-sm mt-1">Try adjusting your search filters.</p>
          </div>
        )}

        {/* Results grid */}
        {!loading && !error && doctors.length > 0 && (
          <>
            <p className="text-sm text-slate-400 font-medium mb-4">
              {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <div
                  key={doc.doctor_id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-2xl shrink-0">
                      {doc.full_name
                        ? doc.full_name.charAt(0).toUpperCase()
                        : "D"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">
                        Dr. {doc.full_name}
                      </h4>
                      <p className="text-xs text-primary font-semibold">
                        {doc.specialization}
                      </p>
                    </div>
                  </div>

                  {doc.bio && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
                      {doc.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    {doc.experience_years > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-primary">
                          workspace_premium
                        </span>
                        {doc.experience_years} yrs
                      </span>
                    )}
                    {doc.consultation_fee > 0 && (
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <span className="material-symbols-outlined text-sm text-primary">
                          payments
                        </span>
                        LKR {Number(doc.consultation_fee).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        doc.verification_status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {doc.verification_status}
                    </span>
                    <button
                      onClick={() => navigate(`/doctors/${doc.doctor_id}`)}
                      className="flex items-center gap-1 text-primary text-sm font-bold hover:underline"
                    >
                      View Profile
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
