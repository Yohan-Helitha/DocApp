import React, { useEffect, useRef, useState } from 'react';
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

export default function PaymentCheckout() {
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const formRef = useRef(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      const { appointmentId, patientId, amount, currency } = parseQueryFromHash();

      try {
        const { status, body } = await Api.post('/api/v1/payments/checkout', {
          appointmentId,
          patientId,
          amount,
          currency
        });

        if (status === 201 && body && body.checkout) {
          setCheckout(body.checkout);
        } else {
          setError(body && body.error ? String(body.error) : 'Unable to create checkout');
        }
      } catch (err) {
        setError('Network error while creating checkout');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    if (checkout && formRef.current) {
      formRef.current.submit();
    }
  }, [checkout]);

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Redirecting to Secure Payment</h1>
      {loading && <p className="text-sm text-slate-600">Preparing your PayHere checkout session...</p>}
      {error && !loading && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
      {!loading && !error && !checkout && (
        <p className="text-sm text-slate-600">Unable to start payment. Please try again later.</p>
      )}
      {checkout && (
        <>
          <p className="text-sm text-slate-600 mb-4">
            You are being redirected to PayHere sandbox to complete your payment.
          </p>
          <form
            ref={formRef}
            method="POST"
            action={checkout.action}
          >
            {Object.entries(checkout.fields || {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
          </form>
        </>
      )}
    </div>
  );
}
