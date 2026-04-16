import React from 'react';

export default function PaymentCancel() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-3">Payment Cancelled</h1>
      <p className="text-sm text-slate-600 mb-2">
        Your PayHere payment was cancelled or could not be completed.
      </p>
      <p className="text-xs text-slate-500">
        If this was a mistake, you can try again from the appointment page.
      </p>
    </div>
  );
}
