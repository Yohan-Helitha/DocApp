import React, { useState, useEffect } from "react";
import Api from "../core/api";

export default function PaymentReturn({ navigate }) {
  const [status, setStatus] = useState("verifying"); // verifying | paid | timeout | error

  useEffect(() => {
    const hash = window.location.hash;
    const qIndex = hash.indexOf("?");
    const params =
      qIndex !== -1
        ? new URLSearchParams(hash.slice(qIndex + 1))
        : new URLSearchParams();

    // PayHere echoes custom_2 back to the return URL — that's where we stored
    // appointmentId when building the checkout fields. Fall back to an explicit
    // appointmentId param (e.g., manual navigation / direct link testing).
    const appointmentId = params.get("custom_2") || params.get("appointmentId");

    if (!appointmentId) {
      setStatus("error");
      return;
    }

    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setStatus("error");
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    let timer;

    const poll = async () => {
      attempts++;
      try {
        const r = await Api.get(`/api/v1/appointments/${appointmentId}`, token);
        if (
          r.status === 200 &&
          r.body?.appointment?.payment_status === "paid"
        ) {
          setStatus("paid");
          return;
        }
      } catch {}
      if (attempts >= MAX_ATTEMPTS) {
        setStatus("timeout");
        return;
      }
      timer = setTimeout(poll, 3000);
    };

    timer = setTimeout(poll, 2000);
    return () => clearTimeout(timer);
  }, []);

  const goToAppointments = () =>
    navigate
      ? navigate("/appointments")
      : (window.location.hash = "/appointments");

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-5xl text-[#0b9385] animate-spin block mb-4">
            progress_activity
          </span>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Verifying Payment…
          </h2>
          <p className="text-sm text-slate-500">
            Please wait while we confirm your payment with PayHere.
          </p>
        </div>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center px-6 max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-green-600">
              check_circle
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Payment Confirmed
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Your payment has been received. Your appointment is now fully
            confirmed.
          </p>
          <button
            onClick={goToAppointments}
            className="px-6 py-2.5 bg-[#0b9385] text-white font-bold rounded-xl text-sm hover:bg-[#0b9385]/90 transition-colors"
          >
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center px-6 max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-amber-600">
              schedule
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Payment Processing
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Your payment is being processed by PayHere. This may take a moment.
            Check your appointments page shortly to see the updated status.
          </p>
          <button
            onClick={goToAppointments}
            className="px-6 py-2.5 bg-[#0b9385] text-white font-bold rounded-xl text-sm hover:bg-[#0b9385]/90 transition-colors"
          >
            View Appointments
          </button>
        </div>
      </div>
    );
  }

  // error
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center px-6 max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-red-500">
            error
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Verification Failed
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          We could not verify your payment status. Please check your
          appointments page.
        </p>
        <button
          onClick={goToAppointments}
          className="px-6 py-2.5 bg-[#0b9385] text-white font-bold rounded-xl text-sm hover:bg-[#0b9385]/90 transition-colors"
        >
          View Appointments
        </button>
      </div>
    </div>
  );
}
