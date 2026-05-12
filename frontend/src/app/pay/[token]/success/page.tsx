import type { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const metadata: Metadata = { title: 'Payment successful' };

async function verifyPayment(token: string, sessionId: string) {
  try {
    const res = await fetch(`${API_URL}/v1/public/pay/${token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

async function fetchPaymentInfo(token: string) {
  try {
    const res = await fetch(`${API_URL}/v1/public/pay/${token}`, { cache: 'no-store' });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function PaySuccessPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id ?? '';
  const verified  = sessionId ? await verifyPayment(params.token, sessionId) : null;
  const info      = await fetchPaymentInfo(params.token);

  const success = verified !== null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center ${success ? 'bg-green-600' : 'bg-red-500'}`}>
          <div className="text-5xl mb-3">{success ? '✓' : '✕'}</div>
          <h1 className="text-xl font-bold text-white">
            {success ? 'Payment Successful!' : 'Payment Verification Failed'}
          </h1>
        </div>

        <div className="p-6 text-center space-y-4">
          {success ? (
            <>
              <p className="text-gray-600">
                Thank you{info?.customerName ? `, ${info.customerName}` : ''}! Your payment has been received and your appointment is confirmed.
              </p>
              {info && (
                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="text-gray-900 font-medium">{info.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Salon</span>
                    <span className="text-gray-900">{info.salonName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Appointment</span>
                    <span className="text-gray-900 text-right max-w-[55%]">
                      {new Date(info.startTime).toLocaleString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">
                A receipt was sent to your email if provided.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                We could not verify your payment. If you believe this is an error, please contact the salon directly.
              </p>
              <Link
                href={`/pay/${params.token}`}
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Try Again
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
