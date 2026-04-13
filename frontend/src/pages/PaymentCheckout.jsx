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

// Load PayHere JS SDK script dynamically
const loadPayHereScript = () => {
  return new Promise((resolve, reject) => {
    if (window.payhere) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.payhere.lk/lib/payhere.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayHere SDK'));
    document.head.appendChild(script);
  });
};

export default function PaymentCheckout({ navigate }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(''); // 'success' | 'dismissed' | 'error'

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      const { appointmentId, patientId, amount, currency } = parseQueryFromHash();

      try {
        // Step 1 — Load PayHere JS SDK
        await loadPayHereScript();

        // Step 2 — Get checkout data from backend
        const { status: httpStatus, body } = await Api.post('/api/v1/payments/checkout', {
          appointmentId,
          patientId,
          amount,
          currency
        });

        if (httpStatus !== 201 || !body || !body.checkout) {
          setError(body && body.error ? String(body.error) : 'Unable to create checkout');
          setLoading(false);
          return;
        }

        const { fields, sandbox } = body.checkout;

        // Step 3 — Set up PayHere event handlers
        window.payhere.onCompleted = function (orderId) {
          console.log('Payment completed. OrderID: ' + orderId);
          setStatus('success');
          // Redirect to return page
          setTimeout(() => {
            navigate('/payments/return');
          }, 1500);
        };

        window.payhere.onDismissed = function () {
          console.log('Payment dismissed');
          setStatus('dismissed');
        };

        window.payhere.onError = function (error) {
          console.log('PayHere Error: ' + error);
          setError('Payment error: ' + error);
        };

        // Step 4 — Build payment object for JS SDK
        const payment = {
          sandbox: sandbox === true || sandbox === 'true',
          merchant_id: fields.merchant_id,
          return_url: undefined,  // JS SDK handles this via onCompleted
          cancel_url: undefined,  // JS SDK handles this via onDismissed
          notify_url: fields.notify_url,
          order_id: fields.order_id,
          items: fields.items,
          amount: fields.amount,
          currency: fields.currency,
          hash: fields.hash,
          first_name: fields.first_name,
          last_name: fields.last_name,
          email: fields.email,
          phone: fields.phone,
          address: fields.address,
          city: fields.city,
          country: fields.country,
          custom_1: fields.custom_1,
          custom_2: fields.custom_2
        };

        setLoading(false);

        // Step 5 — Start PayHere popup
        window.payhere.startPayment(payment);

      } catch (err) {
        console.error(err);
        setError('Network error while creating checkout');
        setLoading(false);
      }
    };

    run();
  }, []);

  // Success state
  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          ✅ Payment Successful!
        </h1>
        <p className="text-sm text-slate-600">
          Redirecting you back...
        </p>
      </div>
    );
  }

  // Dismissed state
  if (status === 'dismissed') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Payment Cancelled
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          You closed the payment window. You can try again below.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">
        Secure Payment
      </h1>
      {loading && (
        <p className="text-sm text-slate-600">
          Preparing your PayHere checkout session...
        </p>
      )}
      {error && !loading && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
      {!loading && !error && (
        <p className="text-sm text-slate-600">
          PayHere payment window should have opened. If not,{' '}
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 underline"
          >
            click here to try again
          </button>.
        </p>
      )}
    </div>
  );
}