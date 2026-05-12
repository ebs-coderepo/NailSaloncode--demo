'use client';

import { useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api.client';

const PAYMENT_METHODS = [
  { value: 'CASH',   label: 'Cash' },
  { value: 'CARD',   label: 'Card (in-person)' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'SQUARE', label: 'Square' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'OTHER',  label: 'Other' },
];

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  bookedVia: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelToken: string;
  customer: { id: string; name: string; phone: string; email: string | null };
  staff: { id: string; name: string };
  service: { id: string; name: string; duration: number; price: string };
  createdAt: string;
};

type Slot = { time: string; staffId: string; staffName: string };

type StaffMini = { id: string; name: string };

type Props = {
  initialAppointments: Appointment[];
  staffList: StaffMini[];
  role: string;
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:   'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW:   'No-show',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING:   'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  COMPLETED: 'bg-blue-50 text-blue-700',
  NO_SHOW:   'bg-gray-100 text-gray-500',
};

export default function AppointmentsClient({ initialAppointments, staffList, role }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | ''>('');
  const [filterStaff, setFilterStaff] = useState('');

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Detail state
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);

  // Payment state
  const [payTarget, setPayTarget] = useState<Appointment | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', notes: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStaffId, setRescheduleStaffId] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const canMutate = role === 'OWNER' || role === 'MANAGER';

  function openReschedule(appt: Appointment) {
    setRescheduleTarget(appt);
    setRescheduleStaffId(appt.staff.id);
    setRescheduleDate('');
    setSlots([]);
    setSelectedSlot(null);
    setSlotsError('');
    setRescheduleError('');
  }

  function closeReschedule() {
    setRescheduleTarget(null);
    setSlots([]);
    setSelectedSlot(null);
    setSlotsError('');
    setRescheduleError('');
  }

  async function handleLoadSlots() {
    if (!rescheduleTarget || !rescheduleDate) return;
    setSlotsLoading(true);
    setSlotsError('');
    setSlots([]);
    setSelectedSlot(null);
    const params = new URLSearchParams({ date: rescheduleDate, staffId: rescheduleStaffId });
    const res = await apiFetch<{ slots: Slot[] }>(
      `/api/v1/admin/appointments/${rescheduleTarget.id}/slots?${params}`,
    );
    setSlotsLoading(false);
    if (res.success && res.data.slots.length > 0) {
      setSlots(res.data.slots);
    } else if (res.success) {
      setSlotsError('No available slots on this date. Try another day.');
    } else {
      setSlotsError(res.message || 'Failed to load slots.');
    }
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !selectedSlot) return;
    setRescheduling(true);
    setRescheduleError('');
    const res = await apiFetch<{ id: string; startTime: string; staff: { id: string; name: string } }>(
      `/api/v1/admin/appointments/${rescheduleTarget.id}/reschedule`,
      {
        method: 'POST',
        body: JSON.stringify({ date: rescheduleDate, time: selectedSlot.time, staffId: selectedSlot.staffId }),
      },
    );
    setRescheduling(false);
    if (res.success) {
      // The old appointment is now CANCELLED; remove it and add the new one at the top
      setAppointments((prev) => {
        const updated = prev.map((a) =>
          a.id === rescheduleTarget.id ? { ...a, status: 'CANCELLED' as AppointmentStatus } : a,
        );
        const newEntry: Appointment = {
          ...rescheduleTarget,
          id:        res.data.id,
          startTime: res.data.startTime,
          status:    'CONFIRMED',
          staff:     res.data.staff,
          cancelToken: (res.data as any).cancelToken ?? rescheduleTarget.cancelToken,
        };
        return [newEntry, ...updated];
      });
      closeReschedule();
    } else {
      setRescheduleError(res.message || 'Failed to reschedule. The slot may have just been taken.');
    }
  }

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterStaff && a.staff.id !== filterStaff) return false;
      return true;
    });
  }, [appointments, filterStatus, filterStaff]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await apiFetch<Appointment>(`/api/v1/admin/appointments/${cancelTarget.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      if (res.success) {
        setAppointments((prev) => prev.map((a) => a.id === cancelTarget.id ? res.data : a));
        setCancelTarget(null);
        setCancelReason('');
      }
    } catch { /* silent */ }
    finally { setCancelling(false); }
  }

  async function handleRecordPayment() {
    if (!payTarget) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) { setPayError('Enter a valid amount.'); return; }
    setPaying(true); setPayError('');
    const res = await apiFetch('/api/v1/admin/payments', {
      method: 'POST',
      body: JSON.stringify({
        appointmentId: payTarget.id,
        amount,
        method: payForm.method,
        notes: payForm.notes || null,
      }),
    });
    setPaying(false);
    if (res.success) {
      setPaidIds((s) => new Set([...s, payTarget.id]));
      setAppointments((prev) => prev.map((a) => a.id === payTarget.id ? { ...a, status: 'COMPLETED' } : a));
      setPayTarget(null);
      setPayForm({ amount: '', method: 'CASH', notes: '' });
    } else {
      setPayError(res.message);
    }
  }

  function handleCopyPaymentLink(appt: Appointment) {
    const url = `${window.location.origin}/pay/${appt.cancelToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(appt.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function formatSlotTime(time: string) {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(); d.setHours(h!, m!, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  // Today's date as YYYY-MM-DD (min value for date picker)
  const today = new Date().toISOString().split('T')[0]!;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">All bookings from the voice AI and your team.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="input text-sm"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {staffList.length > 0 && (
          <select
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
            className="input text-sm"
          >
            <option value="">All staff</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <span className="text-sm text-gray-500 self-center">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No appointments match your filters.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date &amp; Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Staff</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((appt) => (
                <tr key={appt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{formatTime(appt.startTime)}</div>
                    <div className="text-xs text-gray-400">{appt.service.duration} min</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{appt.customer.name}</div>
                    <div className="text-xs text-gray-400">{appt.customer.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{appt.service.name}</div>
                    <div className="text-xs text-gray-400">{appt.service.price}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{appt.staff.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[appt.status]}`}>
                      {STATUS_LABELS[appt.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setDetailTarget(appt)}
                      className="text-xs text-gray-500 hover:text-gray-700 mr-3"
                    >
                      Details
                    </button>
                    {canMutate && (appt.status === 'CONFIRMED' || appt.status === 'PENDING') && !paidIds.has(appt.id) && (
                      <>
                        <button
                          onClick={() => handleCopyPaymentLink(appt)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mr-3"
                          title="Copy payment link to send to customer"
                        >
                          {copiedId === appt.id ? 'Copied!' : 'Payment Link'}
                        </button>
                        <button
                          onClick={() => {
                            const price = appt.service.price.replace(/[^0-9.]/g, '');
                            setPayForm({ amount: price, method: 'CASH', notes: '' });
                            setPayError('');
                            setPayTarget(appt);
                          }}
                          className="text-xs text-green-600 hover:text-green-800 font-medium mr-3"
                        >
                          Record Payment
                        </button>
                        <button
                          onClick={() => openReschedule(appt)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-3"
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                    {canMutate && appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                      <button
                        onClick={() => { setCancelTarget(appt); setCancelReason(''); }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reschedule Appointment</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {rescheduleTarget.customer.name} · {rescheduleTarget.service.name}
                </p>
              </div>
              <button onClick={closeReschedule} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 mb-4">
              Currently: <span className="font-medium text-gray-900">{formatTime(rescheduleTarget.startTime)}</span>
              {' '}with <span className="font-medium text-gray-900">{rescheduleTarget.staff.name}</span>
            </div>

            <div className="space-y-4">
              {/* Date picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                <input
                  type="date"
                  min={today}
                  className="input w-full"
                  value={rescheduleDate}
                  onChange={(e) => { setRescheduleDate(e.target.value); setSlots([]); setSelectedSlot(null); setSlotsError(''); }}
                />
              </div>

              {/* Staff selector */}
              {staffList.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                  <select
                    className="input w-full"
                    value={rescheduleStaffId}
                    onChange={(e) => { setRescheduleStaffId(e.target.value); setSlots([]); setSelectedSlot(null); setSlotsError(''); }}
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Check availability button */}
              <button
                onClick={handleLoadSlots}
                disabled={!rescheduleDate || slotsLoading}
                className="w-full btn-secondary disabled:opacity-50"
              >
                {slotsLoading ? 'Checking availability…' : 'Check Available Times'}
              </button>

              {/* Slots grid */}
              {slotsError && (
                <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">{slotsError}</p>
              )}
              {slots.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Select a time</p>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={`${slot.staffId}-${slot.time}`}
                        onClick={() => setSelectedSlot(slot)}
                        className={`text-sm py-2 rounded-lg border font-medium transition-colors ${
                          selectedSlot?.time === slot.time && selectedSlot?.staffId === slot.staffId
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-700'
                        }`}
                      >
                        {formatSlotTime(slot.time)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm summary */}
              {selectedSlot && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                  New time: <strong>
                    {new Date(rescheduleDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    {' at '}{formatSlotTime(selectedSlot.time)}
                  </strong>
                  {staffList.length > 1 && (
                    <> with <strong>{staffList.find((s) => s.id === rescheduleStaffId)?.name}</strong></>
                  )}
                </div>
              )}

              {rescheduleError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{rescheduleError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeReschedule} className="flex-1 btn-secondary" disabled={rescheduling}>
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedSlot || rescheduling}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {rescheduling ? 'Rescheduling…' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Cancel Appointment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Cancel booking for <strong>{cancelTarget.customer.name}</strong> on{' '}
              {formatTime(cancelTarget.startTime)}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                className="input w-full"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Customer request, staff unavailable…"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelTarget(null)} className="btn-secondary" disabled={cancelling}>Keep</button>
              <button onClick={handleCancel} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg" disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2>
              <button onClick={() => setDetailTarget(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Date" value={formatTime(detailTarget.startTime)} />
              <DetailRow label="Customer" value={`${detailTarget.customer.name} (${detailTarget.customer.phone})`} />
              <DetailRow label="Service" value={`${detailTarget.service.name} — ${detailTarget.service.price}`} />
              <DetailRow label="Staff" value={detailTarget.staff.name} />
              <DetailRow label="Booked via" value={detailTarget.bookedVia} />
              <DetailRow label="Status" value={STATUS_LABELS[detailTarget.status]} />
              {detailTarget.notes && <DetailRow label="Notes" value={detailTarget.notes} />}
              {detailTarget.cancelReason && <DetailRow label="Cancel reason" value={detailTarget.cancelReason} />}
            </dl>
          </div>
        </div>
      )}

      {/* Record Payment modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Record Payment</h2>
            <p className="text-sm text-gray-500 mb-4">
              {payTarget.customer.name} · {payTarget.service.name}
            </p>
            {payError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{payError}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number" step="0.01" min="0.01"
                  className="input w-full"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={payTarget.service.price}
                />
                <p className="text-xs text-gray-400 mt-1">Service price: {payTarget.service.price}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select className="input w-full" value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input className="input w-full" value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Transaction ID, reference, etc." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setPayTarget(null); setPayError(''); }} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={handleRecordPayment} disabled={paying} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {paying ? 'Recording…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 font-medium text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
