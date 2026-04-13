import React, { useEffect, useState } from 'react';
import Api from '../core/api';

const parseQueryFromHash = () => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const [, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  return {
    appointmentId: params.get('appointmentId') || '11111111-1111-1111-1111-111111111111',
    patientId: params.get('patientId') || '22222222-2222-2222-2222-222222222222',
    amount: Number(params.get('amount') || '1800'),
    currency: params.get('currency') || 'LKR'
  };
};

// Posts fields to your backend proxy which forwards to PayHere with spoofed Referer
const redirectViaProxy = (fields) => {
  const form = document.createElement('form');
  form.method = 'POST';
  const base = (import.meta.env.VITE_API_BASE || 'http://localhost:4000').replace(/\/$/, '');
  form.action = `${base}/api/v1/payments/proxy-checkout`;

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

export default function PaymentCheckout({ navigate }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      const { appointmentId, patientId, amount, currency } = parseQueryFromHash();

      try {
        const { status: httpStatus, body } = await Api.post('/api/v1/payments/checkout', {
          appointmentId,
          patientId,
          amount,
          currency
        });

        if (httpStatus !== 201 || !body?.checkout) {
          setError(body?.error ? String(body.error) : 'Unable to create checkout');
          setLoading(false);
          return;
        }

        const { fields } = body.checkout;

        // POST to backend proxy — proxy adds spoofed Referer/Origin for PayHere domain validation
        redirectViaProxy(fields);

      } catch (err) {
        console.error(err);
        setError(err?.message ?? 'Error while creating checkout');
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Secure Payment</h1>
      {loading && <p className="text-sm text-slate-600">Redirecting you to PayHere...</p>}
      {error && !loading && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}