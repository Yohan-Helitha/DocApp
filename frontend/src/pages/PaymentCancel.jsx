import React from "react";

export default function PaymentCancel({ navigate }) {
  const goToAppointments = () =>
    navigate
      ? navigate("/appointments")
      : (window.location.hash = "/appointments");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center px-6 max-w-sm">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-amber-600">
            cancel
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Payment Cancelled
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Your payment was cancelled. Your appointment slot is still reserved
          until the payment deadline — you can try again from your appointments
          page.
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
