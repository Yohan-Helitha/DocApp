import React, { useEffect, useState } from "react";
import Api from "../../core/api";
import Telemedicine from "../telemedicine/Telemedicine";

/**
 * Guards the Telemedicine page for doctors.
 * - Non-doctor roles (patient, admin): allowed through without a check.
 * - Doctor with approved profile: allowed through.
 * - Doctor with pending / rejected profile, or no profile at all: blocked with
 *   an appropriate message and the standard doctor portal sidebar.
 *
 * Telemedicine.jsx is NOT edited — this component wraps it.
 */
export default function TelemedicineGuard({ navigate }) {
  const [status, setStatus] = useState("loading"); // "loading" | "allowed" | "blocked"
  const [blockReason, setBlockReason] = useState(""); // "pending" | "rejected" | "none"

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  const logout = async () => {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await Api.post("/api/v1/auth/logout", { refreshToken });
      } catch {}
    }
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    goTo("/login");
  };

  useEffect(() => {
    const check = async () => {
      const token = sessionStorage.getItem("accessToken");
      if (!token) {
        goTo("/login");
        return;
      }

      let role = "";
      try {
        role = JSON.parse(atob(token.split(".")[1])).role;
      } catch {}

      // Only doctors need the profile approval check
      if (role !== "doctor") {
        setStatus("allowed");
        return;
      }

      try {
        const ownRes = await Api.get("/api/v1/doctors/me", token);
        if (ownRes.status === 200 && ownRes.body?.doctor) {
          const vs = ownRes.body.doctor.verification_status;
          if (vs === "approved") {
            setStatus("allowed");
          } else {
            setBlockReason(vs); // "pending" | "rejected"
            setStatus("blocked");
          }
        } else {
          // No profile record at all
          setBlockReason("none");
          setStatus("blocked");
        }
      } catch {
        // Fail open — let Telemedicine handle its own auth errors
        setStatus("allowed");
      }
    };
    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (status === "allowed") {
    return <Telemedicine navigate={navigate} />;
  }

  // Blocked — show portal layout with an appropriate message
  const isPending = blockReason === "pending";
  const isNone = blockReason === "none";

  return (
    <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 p-4 z-40">
        <div className="mb-10 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">
                clinical_notes
              </span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0b9385]">
                SmartHealth AI
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Doctor Portal
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/success/doctor")}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/doctor/appointments")}
          >
            <span className="material-symbols-outlined">event</span>
            <span className="font-semibold text-sm">Appointments</span>
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/doctor/availability")}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="font-semibold text-sm">Availability</span>
          </a>
          <button
            type="button"
            className="w-full text-left bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer"
          >
            <span className="material-symbols-outlined" data-icon="video_chat">
              video_chat
            </span>
            <span className="font-semibold text-sm">Telemedicine</span>
          </button>
        </nav>
        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <span className="font-semibold text-sm">Help Center</span>
          </a>
          <button
            onClick={logout}
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>
      <main className="md:ml-64 p-8 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: isNone
                ? "rgb(241 245 249)"
                : isPending
                  ? "rgb(254 249 195)"
                  : "rgb(254 226 226)",
            }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{
                color: isNone ? "#64748b" : isPending ? "#ca8a04" : "#dc2626",
              }}
            >
              {isNone ? "person_off" : isPending ? "schedule" : "cancel"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {isNone
              ? "No Doctor Profile Found"
              : isPending
                ? "Profile Verification Pending"
                : "Profile Not Approved"}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            {isNone
              ? "You haven't set up your doctor profile yet. Please visit the Overview page to create your profile first."
              : isPending
                ? "Your profile is awaiting admin verification. Telemedicine will be available once your profile is approved."
                : "Your profile application was not approved. Please contact platform support for assistance."}
          </p>
          <button
            onClick={() => goTo("/success/doctor")}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            Go to Overview
          </button>
        </div>
      </main>
    </div>
  );
}
