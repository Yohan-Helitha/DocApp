import React from 'react';

export default function PaymentReturn() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-3">Payment Completed</h1>
      <p className="text-sm text-slate-600 mb-2">
        Thank you. Your payment has been processed by PayHere.
      </p>
      <p className="text-xs text-slate-500">
        You can safely close this page or return to your dashboard.
      </p>
    </div>
  );
}
