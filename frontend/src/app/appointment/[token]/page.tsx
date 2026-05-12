'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const SLUG    = process.env.NEXT_PUBLIC_SALON_SLUG ?? 'luxe-nails';

type Appt = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  customer: { name: string; phone: string };
  staff: { name: string };
  service: { name: string; duration: number; price: string };
};

type Slot = { time: string; staff: { id: string; name: string }[] };

function fmtDateTime(iso: string, tz?: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const yr = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(d.getUTCDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

type View = 'detail' | 'cancel' | 'reschedule' | 'done';

export default function AppointmentPage() {
  const { token } = useParams<{ token: string }>();
  const [appt, setAppt]         = useState<Appt | null>(null);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<View>('detail');
  const [error, setError]       = useState('');
  const [result, setResult]     = useState('');

  // Cancel state
  const [cancelReason, setCancelReason] = useState('');
  const [cancelWorking, setCancelWorking] = useState(false);

  // Reschedule state
  const [rsDate, setRsDate]         = useState('');
  const [rsSlots, setRsSlots]       = useState<Slot[]>([]);
  const [rsLoading, setRsLoading]   = useState(false);
  const [rsStaffId, setRsStaffId]   = useState('');
  const [rsTime, setRsTime]         = useState('');
  const [rsWorking, setRsWorking]   = useState(false);

  const loadAppt = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/public/appointment/${token}`);
      const json = await res.json();
      if (json.success) setAppt(json.data);
      else setError(json.message ?? 'Appointment not found');
    } catch {
      setError('Could not load appointment details.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAppt(); }, [loadAppt]);

  const handleCancel = async () => {
    setCancelWorking(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/public/appointment/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || null }),
      });
      const json = await res.json();
      if (json.success) {
        setResult('Your appointment has been cancelled.');
        setView('done');
      } else {
        setError(json.message ?? 'Failed to cancel appointment.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setCancelWorking(false);
    }
  };

  const fetchSlots = async (date: string) => {
    if (!appt || !date) return;
    setRsLoading(true);
    setRsSlots([]);
    setRsTime('');
    try {
      const params = new URLSearchParams({
        serviceId: appt.service.name, // we'll pass service id from appt
        date,
      });
      // We don't have serviceId here easily — need to re-fetch from appt details
      // Use the full /availability endpoint
      const res = await fetch(`${API_URL}/v1/public/${SLUG}/availability?date=${date}&serviceId=`);
      const json = await res.json();
      if (json.success) setRsSlots(json.data.slots ?? []);
    } catch { /* ignore */ } finally {
      setRsLoading(false);
    }
  };

  // Reschedule - we need serviceId. Let's get it from the appointment details.
  // Since the appt object returned by backend doesn't include serviceId directly
  // (it only has service.name), we need to store it. Let me store it as a state.
  const [serviceId, setServiceId] = useState('');

  useEffect(() => {
    if (!appt) return;
    // Fetch serviceId by searching available services
    fetch(`${API_URL}/v1/public/${SLUG}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const svc = json.data.services.find((s: any) => s.name === appt.service.name);
          if (svc) setServiceId(svc.id);
        }
      }).catch(() => {});
  }, [appt]);

  const fetchSlotsForService = async (date: string) => {
    if (!serviceId || !date) return;
    setRsLoading(true);
    setRsSlots([]);
    setRsTime('');
    setRsStaffId('');
    try {
      const res = await fetch(`${API_URL}/v1/public/${SLUG}/availability?date=${date}&serviceId=${serviceId}`);
      const json = await res.json();
      if (json.success) setRsSlots(json.data.slots ?? []);
    } catch { /* ignore */ } finally {
      setRsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rsDate || !rsTime || !rsStaffId) return;
    setRsWorking(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/public/appointment/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rsDate, time: rsTime, staffId: rsStaffId }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(`Appointment rescheduled! Your new appointment is on ${fmtDateTime(json.data.startTime)}.`);
        setView('done');
      } else {
        setError(json.message ?? 'Failed to reschedule.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setRsWorking(false);
    }
  };

  // Min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading your appointment…</p>
    </div>
  );

  if (error && !appt) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Not Found</h1>
        <p className="text-gray-500">{error}</p>
        <Link href="/" className="mt-6 inline-block text-pink-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  const isCancellable = appt && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Back to home</Link>
          <span className="font-semibold">Your Appointment</span>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {view === 'done' && (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Done!</h2>
            <p className="text-gray-600">{result}</p>
            <Link href="/" className="mt-6 inline-block bg-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-pink-700 transition">
              Back to Home
            </Link>
          </div>
        )}

        {view === 'detail' && appt && (
          <div className="space-y-6">
            {/* Status badge */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Appointment Details</h2>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  appt.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                  appt.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{appt.status}</span>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500 text-sm">Service</dt>
                  <dd className="font-medium text-gray-900">{appt.service.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 text-sm">Technician</dt>
                  <dd className="font-medium text-gray-900">{appt.staff.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 text-sm">Date & Time</dt>
                  <dd className="font-medium text-gray-900 text-right">{fmtDateTime(appt.startTime)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 text-sm">Duration</dt>
                  <dd className="font-medium text-gray-900">{appt.service.duration} min</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 text-sm">Price</dt>
                  <dd className="font-medium text-gray-900">{appt.service.price}</dd>
                </div>
              </dl>
            </div>

            {isCancellable && (
              <div className="flex gap-3">
                <button
                  onClick={() => setView('reschedule')}
                  className="flex-1 bg-pink-600 text-white py-3 rounded-xl font-medium hover:bg-pink-700 transition"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => setView('cancel')}
                  className="flex-1 bg-white border border-red-300 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 transition"
                >
                  Cancel Appointment
                </button>
              </div>
            )}

            {!isCancellable && (
              <p className="text-center text-sm text-gray-400">This appointment cannot be modified.</p>
            )}
          </div>
        )}

        {view === 'cancel' && appt && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Cancel Appointment</h2>
            <p className="text-gray-500 text-sm">Are you sure you want to cancel your {appt.service.name} appointment on {fmtDateTime(appt.startTime)}?</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Let us know why you're cancelling…"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setView('detail')} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                Go Back
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelWorking}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50"
              >
                {cancelWorking ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}

        {view === 'reschedule' && appt && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Reschedule Appointment</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pick a new date</label>
              <input
                type="date"
                min={minDate}
                value={rsDate}
                onChange={e => { setRsDate(e.target.value); fetchSlotsForService(e.target.value); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {rsDate && (
              <div>
                {rsLoading ? (
                  <p className="text-gray-400 text-sm">Loading available slots…</p>
                ) : rsSlots.length === 0 ? (
                  <p className="text-gray-500 text-sm">No available slots on this date.</p>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select time</label>
                    <div className="grid grid-cols-3 gap-2">
                      {rsSlots.map(slot => (
                        <button
                          key={slot.time}
                          onClick={() => {
                            setRsTime(slot.time);
                            setRsStaffId(slot.staff[0]?.id ?? '');
                          }}
                          className={`py-2 text-sm rounded-lg border transition ${
                            rsTime === slot.time
                              ? 'bg-pink-600 border-pink-600 text-white'
                              : 'border-gray-200 text-gray-700 hover:border-pink-400 hover:text-pink-600'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setView('detail')} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                Go Back
              </button>
              <button
                onClick={handleReschedule}
                disabled={rsWorking || !rsDate || !rsTime}
                className="flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition text-sm font-medium disabled:opacity-50"
              >
                {rsWorking ? 'Rescheduling…' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
