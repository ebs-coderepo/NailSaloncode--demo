'use client';

import { useState } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type PaymentInfo = {
  salonName: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: string;
  amount: number;
  currency: string;
  isPaid: boolean;
  appointmentStatus: string;
  stripeEnabled: boolean;
  payment: { paidAt: string | null; amount: number; method: string } | null;
};

export default function PayClient({ token, info }: { token: string; info: PaymentInfo }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: info.currency,
  }).format(info.amount);

  const formattedDate = new Date(info.startTime).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  async function handlePay() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/public/pay/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        setError(json.message ?? 'Failed to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white p-6">
          <p className="text-sm text-gray-400 mb-1">{info.salonName}</p>
          <h1 className="text-xl font-semibold">Payment Request</h1>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-semibold text-gray-900">{info.serviceName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Amount due</p>
              <p className="text-2xl font-bold text-gray-900">{formatted}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="text-gray-900">{info.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Staff</span>
              <span className="text-gray-900">{info.staffName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Appointment</span>
              <span className="text-gray-900 text-right max-w-[55%]">{formattedDate}</span>
            </div>
          </div>

          {/* Paid state */}
          {info.isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">✓</div>
              <p className="font-semibold text-green-800">Payment Received</p>
              {info.payment?.paidAt && (
                <p className="text-sm text-green-600 mt-1">
                  Paid on {new Date(info.payment.paidAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {/* Stripe pay button */}
          {!info.isPaid && info.stripeEnabled && (
            <div className="pt-2">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>
              )}
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-base"
              >
                {loading ? 'Redirecting to payment…' : `Pay ${formatted} securely`}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Powered by Stripe · 256-bit SSL encryption
              </p>
            </div>
          )}

          {/* No online payment configured */}
          {!info.isPaid && !info.stripeEnabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="font-medium text-amber-800">Pay at the salon</p>
              <p className="text-sm text-amber-600 mt-1">
                Online payment is not available for this location. Please pay in person at your appointment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
