'use client';

import { useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api.client';

// ── Types ──────────────────────────────────────────────────────────────────────

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
type RequestType       = 'CANCEL' | 'RESCHEDULE' | 'COMPLETE';
type RequestStatus     = 'PENDING' | 'APPROVED' | 'REJECTED';

type Appointment = {
  id: string; startTime: string; endTime: string;
  status: AppointmentStatus; notes: string | null;
  bookedVia: string; cancelledAt: string | null; cancelReason: string | null;
  cancelToken: string;
  customer: { id: string; name: string; phone: string; email: string | null };
  staff:    { id: string; name: string };
  service:  { id: string; name: string; duration: number; price: string };
  createdAt: string;
};

type AppointmentRequest = {
  id: string; appointmentId: string;
  type: RequestType; status: RequestStatus;
  reason: string | null; proposedDate: string | null;
  proposedTime: string | null; proposedStaffId: string | null;
  reviewNote: string | null; createdAt: string;
  requestedBy: { id: string; name: string; role: string };
  appointment: {
    id: string; startTime: string; status: string; cancelToken: string;
    customer: { name: string; phone: string };
    staff:    { id: string; name: string };
    service:  { name: string; duration: number; price: string };
  };
};

type Slot      = { time: string; staffId: string; staffName: string };
type StaffMini = { id: string; name: string };

type Props = {
  initialAppointments: Appointment[];
  initialRequests:     AppointmentRequest[];
  staffList:           StaffMini[];
  role:                string;
  userId:              string;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled',
  COMPLETED: 'Completed', NO_SHOW: 'No-show',
};

const STATUS_PILL: Record<AppointmentStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-800 ring-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  CANCELLED: 'bg-red-100 text-red-700 ring-red-200',
  COMPLETED: 'bg-blue-100 text-blue-800 ring-blue-200',
  NO_SHOW:   'bg-gray-100 text-gray-500 ring-gray-200',
};

const STATUS_BAR: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-400', CONFIRMED: 'bg-emerald-500',
  CANCELLED: 'bg-red-400', COMPLETED: 'bg-blue-500', NO_SHOW: 'bg-gray-300',
};

const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  CANCEL: 'Cancel', RESCHEDULE: 'Reschedule', COMPLETE: 'Mark Complete',
};

const REQUEST_TYPE_COLOR: Record<RequestType, string> = {
  CANCEL:     'bg-red-50 text-red-700 ring-red-200',
  RESCHEDULE: 'bg-blue-50 text-blue-700 ring-blue-200',
  COMPLETE:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' }, { value: 'CARD', label: 'Card' },
  { value: 'STRIPE', label: 'Stripe' }, { value: 'SQUARE', label: 'Square' },
  { value: 'PAYPAL', label: 'PayPal' }, { value: 'OTHER', label: 'Other' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function fmtSlot(t: string) {
  const [h, m] = t.split(':').map(Number);
  const d = new Date(); d.setHours(h!, m!);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AppointmentsClient({
  initialAppointments, initialRequests, staffList, role, userId,
}: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [requests, setRequests]         = useState<AppointmentRequest[]>(initialRequests);
  const [activeTab, setActiveTab]       = useState<'all' | 'today' | 'requests'>('all');
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | ''>('');
  const [filterStaff, setFilterStaff]   = useState('');

  // Owner direct-action modals
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling]     = useState(false);

  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);

  const [payTarget, setPayTarget] = useState<Appointment | null>(null);
  const [payForm, setPayForm]     = useState({ amount: '', method: 'CASH', notes: '' });
  const [paying, setPaying]       = useState(false);
  const [payError, setPayError]   = useState('');
  const [paidIds, setPaidIds]     = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId]   = useState<string | null>(null);

  // Owner reschedule modal
  const [rescheduleTarget, setRescheduleTarget]   = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate]       = useState('');
  const [rescheduleStaffId, setRescheduleStaffId] = useState('');
  const [slots, setSlots]                         = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading]           = useState(false);
  const [slotsError, setSlotsError]               = useState('');
  const [selectedSlot, setSelectedSlot]           = useState<Slot | null>(null);
  const [rescheduling, setRescheduling]           = useState(false);
  const [rescheduleError, setRescheduleError]     = useState('');

  // Staff request modal
  const [reqTarget, setReqTarget]       = useState<Appointment | null>(null);
  const [reqType, setReqType]           = useState<RequestType>('COMPLETE');
  const [reqReason, setReqReason]       = useState('');
  const [reqDate, setReqDate]           = useState('');
  const [reqStaffId, setReqStaffId]     = useState('');
  const [reqSlots, setReqSlots]         = useState<Slot[]>([]);
  const [reqSlotsLoading, setReqSlotsLoading] = useState(false);
  const [reqSelectedSlot, setReqSelectedSlot] = useState<Slot | null>(null);
  const [reqSubmitting, setReqSubmitting]     = useState(false);
  const [reqError, setReqError]               = useState('');

  // Request review modal (owner/manager)
  const [reviewTarget, setReviewTarget] = useState<AppointmentRequest | null>(null);
  const [reviewNote, setReviewNote]     = useState('');
  const [reviewing, setReviewing]       = useState(false);
  const [reviewError, setReviewError]   = useState('');

  const isManager = role === 'OWNER' || role === 'MANAGER';
  const today     = new Date().toISOString().split('T')[0]!;
  const pendingReqCount = requests.filter((r) => r.status === 'PENDING').length;

  // ── Filtered lists ─────────────────────────────────────────────────────────

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const displayed = useMemo(() => {
    return appointments.filter((a) => {
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterStaff  && a.staff.id !== filterStaff) return false;
      if (activeTab === 'today') {
        const t = new Date(a.startTime);
        return t >= todayStart && t <= todayEnd;
      }
      return true;
    });
  }, [appointments, filterStatus, filterStaff, activeTab]);

  const displayedRequests = useMemo(
    () => requests.filter((r) => activeTab !== 'requests' || true),
    [requests],
  );
  const pendingRequests  = displayedRequests.filter((r) => r.status === 'PENDING');
  const resolvedRequests = displayedRequests.filter((r) => r.status !== 'PENDING');

  // ── Owner: direct actions ──────────────────────────────────────────────────

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    const res = await apiFetch<Appointment>(`/api/v1/admin/appointments/${cancelTarget.id}/cancel`, {
      method: 'POST', body: JSON.stringify({ reason: cancelReason || undefined }),
    });
    setCancelling(false);
    if (res.success) {
      setAppointments((p) => p.map((a) => a.id === cancelTarget.id ? res.data : a));
      setCancelTarget(null); setCancelReason('');
    }
  }

  async function handleRecordPayment() {
    if (!payTarget) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) { setPayError('Enter a valid amount.'); return; }
    setPaying(true); setPayError('');
    const res = await apiFetch('/api/v1/admin/payments', {
      method: 'POST',
      body: JSON.stringify({ appointmentId: payTarget.id, amount, method: payForm.method, notes: payForm.notes || null }),
    });
    setPaying(false);
    if (res.success) {
      setPaidIds((s) => new Set([...s, payTarget.id]));
      setAppointments((p) => p.map((a) => a.id === payTarget.id ? { ...a, status: 'COMPLETED' as const } : a));
      setPayTarget(null); setPayForm({ amount: '', method: 'CASH', notes: '' });
    } else { setPayError(res.message); }
  }

  function handleCopyLink(appt: Appointment) {
    navigator.clipboard.writeText(`${window.location.origin}/pay/${appt.cancelToken}`).then(() => {
      setCopiedId(appt.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleLoadSlots(apptId: string, date: string, staffId: string, forReq = false) {
    if (forReq) { setReqSlotsLoading(true); setReqSlots([]); setReqSelectedSlot(null); }
    else        { setSlotsLoading(true);    setSlots([]);    setSelectedSlot(null);     }
    const params = new URLSearchParams({ date, staffId });
    const res = await apiFetch<{ slots: Slot[] }>(`/api/v1/admin/appointments/${apptId}/slots?${params}`);
    if (forReq) { setReqSlotsLoading(false); if (res.success) setReqSlots(res.data.slots); else setReqError(res.message); }
    else        { setSlotsLoading(false);    if (res.success) setSlots(res.data.slots);    else setSlotsError(res.message); }
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !selectedSlot) return;
    setRescheduling(true); setRescheduleError('');
    const res = await apiFetch<any>(`/api/v1/admin/appointments/${rescheduleTarget.id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ date: rescheduleDate, time: selectedSlot.time, staffId: selectedSlot.staffId }),
    });
    setRescheduling(false);
    if (res.success) {
      setAppointments((p) => {
        const updated = p.map((a) => a.id === rescheduleTarget.id ? { ...a, status: 'CANCELLED' as const } : a);
        return [{ ...rescheduleTarget, id: res.data.id, startTime: res.data.startTime, status: 'CONFIRMED' as const, staff: res.data.staff, cancelToken: res.data.cancelToken ?? rescheduleTarget.cancelToken }, ...updated];
      });
      setRescheduleTarget(null); setSlots([]); setSelectedSlot(null);
    } else { setRescheduleError(res.message); }
  }

  // ── Staff: submit request ──────────────────────────────────────────────────

  function openReqModal(appt: Appointment) {
    setReqTarget(appt); setReqType('COMPLETE'); setReqReason('');
    setReqDate(''); setReqStaffId(appt.staff.id);
    setReqSlots([]); setReqSelectedSlot(null); setReqError('');
  }

  async function handleSubmitRequest() {
    if (!reqTarget) return;
    if (reqType === 'RESCHEDULE' && (!reqDate || !reqSelectedSlot)) {
      setReqError('Please select a date and time slot for the reschedule.'); return;
    }
    setReqSubmitting(true); setReqError('');
    const body: any = { type: reqType, reason: reqReason || null };
    if (reqType === 'RESCHEDULE') {
      body.proposedDate    = reqDate;
      body.proposedTime    = reqSelectedSlot!.time;
      body.proposedStaffId = reqSelectedSlot!.staffId;
    }
    const res = await apiFetch<AppointmentRequest>(`/api/v1/admin/requests/appointment/${reqTarget.id}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    setReqSubmitting(false);
    if (res.success) {
      setRequests((p) => [res.data, ...p]);
      setReqTarget(null);
    } else { setReqError(res.message); }
  }

  // ── Owner: review request ──────────────────────────────────────────────────

  async function handleReview(action: 'approve' | 'reject') {
    if (!reviewTarget) return;
    setReviewing(true); setReviewError('');
    const res = await apiFetch<AppointmentRequest>(`/api/v1/admin/requests/${reviewTarget.id}/${action}`, {
      method: 'POST', body: JSON.stringify({ reviewNote: reviewNote || null }),
    });
    setReviewing(false);
    if (res.success) {
      setRequests((p) => p.map((r) => r.id === reviewTarget.id ? res.data : r));
      if (action === 'approve') {
        // Reflect the change on the appointment in the list
        const req = reviewTarget;
        setAppointments((p) => p.map((a) => {
          if (a.id !== req.appointmentId) return a;
          if (req.type === 'CANCEL')   return { ...a, status: 'CANCELLED' as const };
          if (req.type === 'COMPLETE') return { ...a, status: 'COMPLETED' as const };
          return a;
        }));
      }
      setReviewTarget(null); setReviewNote('');
    } else { setReviewError(res.message); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const todayCount = appointments.filter((a) => {
    const t = new Date(a.startTime);
    return t >= todayStart && t <= todayEnd && a.status !== 'CANCELLED';
  }).length;

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {todayCount} scheduled today · {appointments.filter((a) => a.status === 'CONFIRMED').length} confirmed total
          </p>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {(['all', 'today', 'requests'] as const).map((tab) => (
          (tab !== 'requests' || isManager) && (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'all'      && 'All Appointments'}
              {tab === 'today'    && 'Today'}
              {tab === 'requests' && 'Staff Requests'}
              {tab === 'requests' && pendingReqCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {pendingReqCount}
                </span>
              )}
            </button>
          )
        ))}
      </div>

      {/* ── Requests tab ────────────────────────────────────────────────── */}
      {activeTab === 'requests' && isManager && (
        <div className="space-y-4">
          {/* Pending */}
          {pendingRequests.length === 0 && resolvedRequests.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-500 font-medium">No requests</p>
              <p className="text-sm text-gray-400 mt-1">Staff haven't submitted any requests yet.</p>
            </div>
          )}
          {pendingRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending Review</h2>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <RequestCard key={req.id} req={req} onReview={() => { setReviewTarget(req); setReviewNote(''); setReviewError(''); }} />
                ))}
              </div>
            </div>
          )}
          {resolvedRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Resolved</h2>
              <div className="space-y-2">
                {resolvedRequests.slice(0, 20).map((req) => (
                  <RequestCard key={req.id} req={req} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Appointment list tabs ────────────────────────────────────────── */}
      {activeTab !== 'requests' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="input text-sm h-9 py-0">
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            {staffList.length > 1 && (
              <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="input text-sm h-9 py-0">
                <option value="">All staff</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <span className="text-sm text-gray-400 self-center ml-1">{displayed.length} result{displayed.length !== 1 ? 's' : ''}</span>
          </div>

          {displayed.length === 0 ? (
            <div className="card p-16 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-500">No appointments match your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((appt) => {
                const myPendingReq = requests.find(
                  (r) => r.appointmentId === appt.id && r.requestedBy.id === userId && r.status === 'PENDING',
                );
                const canAct = appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED';

                return (
                  <div key={appt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="flex">
                      {/* Status bar */}
                      <div className={`w-1 flex-shrink-0 rounded-l-xl ${STATUS_BAR[appt.status]}`} />

                      <div className="flex-1 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Date/time block */}
                        <div className="sm:w-36 flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{fmtTime(appt.startTime)}</p>
                          <p className="text-xs text-gray-400">{fmtDate(appt.startTime)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{appt.service.duration} min</p>
                        </div>

                        {/* Customer */}
                        <div className="sm:w-44 flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{appt.customer.name}</p>
                          <p className="text-xs text-gray-400">{appt.customer.phone}</p>
                        </div>

                        {/* Service */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">{appt.service.name}</p>
                          <p className="text-xs text-gray-400">{appt.service.price}</p>
                        </div>

                        {/* Staff avatar */}
                        <div className="sm:w-28 flex-shrink-0 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {initials(appt.staff.name)}
                          </div>
                          <span className="text-xs text-gray-600 truncate">{appt.staff.name}</span>
                        </div>

                        {/* Status badge */}
                        <div className="sm:w-28 flex-shrink-0">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${STATUS_PILL[appt.status]}`}>
                            {STATUS_LABEL[appt.status]}
                          </span>
                          {myPendingReq && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                              {REQUEST_TYPE_LABEL[myPendingReq.type]} requested
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                          <button onClick={() => setDetailTarget(appt)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors">
                            Details
                          </button>

                          {isManager && canAct && !paidIds.has(appt.id) && (
                            <>
                              {(appt.status === 'CONFIRMED' || appt.status === 'PENDING') && (
                                <>
                                  <button onClick={() => handleCopyLink(appt)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors">
                                    {copiedId === appt.id ? '✓ Copied' : 'Pay Link'}
                                  </button>
                                  <button onClick={() => { const p = appt.service.price.replace(/[^0-9.]/g, ''); setPayForm({ amount: p, method: 'CASH', notes: '' }); setPayError(''); setPayTarget(appt); }} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors">
                                    Payment
                                  </button>
                                  <button onClick={() => { setRescheduleTarget(appt); setRescheduleStaffId(appt.staff.id); setRescheduleDate(''); setSlots([]); setSelectedSlot(null); setSlotsError(''); setRescheduleError(''); }} className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors">
                                    Reschedule
                                  </button>
                                </>
                              )}
                              <button onClick={() => { setCancelTarget(appt); setCancelReason(''); }} className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors">
                                Cancel
                              </button>
                            </>
                          )}

                          {!isManager && canAct && !myPendingReq && (
                            <button onClick={() => openReqModal(appt)} className="text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                              Submit Request
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Staff: submit request modal */}
      {reqTarget && (
        <Modal title="Submit Request" subtitle={`${reqTarget.customer.name} · ${reqTarget.service.name} · ${fmtDateTime(reqTarget.startTime)}`} onClose={() => setReqTarget(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['COMPLETE', 'RESCHEDULE', 'CANCEL'] as RequestType[]).map((t) => (
                  <button key={t} onClick={() => { setReqType(t); setReqSlots([]); setReqSelectedSlot(null); setReqError(''); }}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${reqType === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {REQUEST_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {reqType === 'RESCHEDULE' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Date</label>
                  <input type="date" min={today} className="input w-full" value={reqDate}
                    onChange={(e) => { setReqDate(e.target.value); setReqSlots([]); setReqSelectedSlot(null); }} />
                </div>
                {staffList.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                    <select className="input w-full" value={reqStaffId} onChange={(e) => { setReqStaffId(e.target.value); setReqSlots([]); setReqSelectedSlot(null); }}>
                      {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={() => handleLoadSlots(reqTarget.id, reqDate, reqStaffId, true)} disabled={!reqDate || reqSlotsLoading} className="w-full btn-secondary disabled:opacity-50">
                  {reqSlotsLoading ? 'Checking…' : 'Check Available Times'}
                </button>
                {reqSlots.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {reqSlots.map((s) => (
                      <button key={`${s.staffId}-${s.time}`} onClick={() => setReqSelectedSlot(s)}
                        className={`text-sm py-2 rounded-lg border font-medium transition-colors ${reqSelectedSlot?.time === s.time ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                        {fmtSlot(s.time)}
                      </button>
                    ))}
                  </div>
                )}
                {reqSelectedSlot && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                    Proposing: <strong>{new Date(reqDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {fmtSlot(reqSelectedSlot.time)}</strong>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {reqType === 'CANCEL' ? 'Reason for cancellation' : 'Note to owner'} <span className="text-gray-400">(optional)</span>
              </label>
              <textarea className="input w-full h-20 resize-none" value={reqReason} onChange={(e) => setReqReason(e.target.value)} placeholder="Explain the reason…" />
            </div>

            {reqError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{reqError}</p>}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setReqTarget(null)} className="flex-1 btn-secondary">Cancel</button>
            <button onClick={handleSubmitRequest} disabled={reqSubmitting}
              className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              {reqSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </Modal>
      )}

      {/* Owner: review request modal */}
      {reviewTarget && (
        <Modal title={`Review: ${REQUEST_TYPE_LABEL[reviewTarget.type]} Request`}
          subtitle={`From ${reviewTarget.requestedBy.name} · ${reviewTarget.appointment.customer.name} · ${fmtDateTime(reviewTarget.appointment.startTime)}`}
          onClose={() => setReviewTarget(null)}>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
              <InfoRow label="Service"  value={reviewTarget.appointment.service.name} />
              <InfoRow label="Staff"    value={reviewTarget.appointment.staff.name} />
              <InfoRow label="Current"  value={fmtDateTime(reviewTarget.appointment.startTime)} />
              {reviewTarget.reason && <InfoRow label="Reason" value={reviewTarget.reason} />}
              {reviewTarget.type === 'RESCHEDULE' && reviewTarget.proposedDate && reviewTarget.proposedTime && (
                <InfoRow label="Proposed" value={`${new Date(reviewTarget.proposedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${fmtSlot(reviewTarget.proposedTime)}`} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400">(optional)</span></label>
              <textarea className="input w-full h-16 resize-none" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add a note for the staff member…" />
            </div>
            {reviewError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{reviewError}</p>}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setReviewTarget(null)} className="btn-secondary flex-1" disabled={reviewing}>Cancel</button>
            <button onClick={() => handleReview('reject')} disabled={reviewing}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {reviewing ? '…' : 'Reject'}
            </button>
            <button onClick={() => handleReview('approve')} disabled={reviewing}
              className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {reviewing ? 'Processing…' : 'Approve'}
            </button>
          </div>
        </Modal>
      )}

      {/* Owner: cancel modal */}
      {cancelTarget && (
        <Modal title="Cancel Appointment" subtitle={`${cancelTarget.customer.name} · ${fmtDateTime(cancelTarget.startTime)}`} onClose={() => setCancelTarget(null)}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-gray-400">(optional)</span></label>
            <input className="input w-full" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Customer request, staff unavailable…" />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setCancelTarget(null)} className="flex-1 btn-secondary" disabled={cancelling}>Keep</button>
            <button onClick={handleCancel} disabled={cancelling} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60">
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </button>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {detailTarget && (
        <Modal title="Appointment Details" onClose={() => setDetailTarget(null)}>
          <dl className="space-y-3 text-sm">
            <InfoRow label="Date"       value={fmtDateTime(detailTarget.startTime)} />
            <InfoRow label="Customer"   value={`${detailTarget.customer.name} · ${detailTarget.customer.phone}`} />
            <InfoRow label="Service"    value={`${detailTarget.service.name} · ${detailTarget.service.price}`} />
            <InfoRow label="Staff"      value={detailTarget.staff.name} />
            <InfoRow label="Booked via" value={detailTarget.bookedVia} />
            <InfoRow label="Status"     value={STATUS_LABEL[detailTarget.status]} />
            {detailTarget.notes        && <InfoRow label="Notes"  value={detailTarget.notes} />}
            {detailTarget.cancelReason && <InfoRow label="Reason" value={detailTarget.cancelReason} />}
          </dl>
        </Modal>
      )}

      {/* Owner: record payment modal */}
      {payTarget && (
        <Modal title="Record Payment" subtitle={`${payTarget.customer.name} · ${payTarget.service.name}`} onClose={() => { setPayTarget(null); setPayError(''); }}>
          {payError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{payError}</p>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input type="number" step="0.01" min="0.01" className="input w-full" value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Service price: {payTarget.service.price}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select className="input w-full" value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
              <input className="input w-full" value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Reference, transaction ID…" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setPayTarget(null); setPayError(''); }} className="flex-1 btn-secondary">Cancel</button>
            <button onClick={handleRecordPayment} disabled={paying} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60">
              {paying ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </Modal>
      )}

      {/* Owner: reschedule modal */}
      {rescheduleTarget && (
        <Modal title="Reschedule Appointment" subtitle={`${rescheduleTarget.customer.name} · ${rescheduleTarget.service.name}`} onClose={() => setRescheduleTarget(null)}>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 mb-4">
            Currently: <strong className="text-gray-900">{fmtDateTime(rescheduleTarget.startTime)}</strong> with <strong className="text-gray-900">{rescheduleTarget.staff.name}</strong>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
              <input type="date" min={today} className="input w-full" value={rescheduleDate}
                onChange={(e) => { setRescheduleDate(e.target.value); setSlots([]); setSelectedSlot(null); setSlotsError(''); }} />
            </div>
            {staffList.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <select className="input w-full" value={rescheduleStaffId}
                  onChange={(e) => { setRescheduleStaffId(e.target.value); setSlots([]); setSelectedSlot(null); }}>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => handleLoadSlots(rescheduleTarget.id, rescheduleDate, rescheduleStaffId)} disabled={!rescheduleDate || slotsLoading} className="w-full btn-secondary disabled:opacity-50">
              {slotsLoading ? 'Checking availability…' : 'Check Available Times'}
            </button>
            {slotsError && <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">{slotsError}</p>}
            {slots.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Select a time</p>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button key={`${s.staffId}-${s.time}`} onClick={() => setSelectedSlot(s)}
                      className={`text-sm py-2 rounded-xl border font-medium transition-colors ${selectedSlot?.time === s.time && selectedSlot?.staffId === s.staffId ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                      {fmtSlot(s.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedSlot && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                New time: <strong>{new Date(rescheduleDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {fmtSlot(selectedSlot.time)}</strong>
              </div>
            )}
            {rescheduleError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{rescheduleError}</p>}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setRescheduleTarget(null)} className="flex-1 btn-secondary" disabled={rescheduling}>Cancel</button>
            <button onClick={handleReschedule} disabled={!selectedSlot || rescheduling} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              {rescheduling ? 'Rescheduling…' : 'Confirm Reschedule'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-2xl leading-none ml-4">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 flex-shrink-0 font-medium text-gray-400">{label}</dt>
      <dd className="text-gray-900 min-w-0 break-words">{value}</dd>
    </div>
  );
}

function RequestCard({ req, onReview }: { req: AppointmentRequest; onReview?: () => void }) {
  const isPending = req.status === 'PENDING';
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isPending ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ${REQUEST_TYPE_COLOR[req.type]}`}>
              {REQUEST_TYPE_LABEL[req.type]}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPending ? 'bg-amber-100 text-amber-700' : req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{req.appointment.customer.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {req.appointment.service.name} · {new Date(req.appointment.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
          {req.reason && <p className="text-xs text-gray-400 mt-1 italic">"{req.reason}"</p>}
          {req.type === 'RESCHEDULE' && req.proposedDate && req.proposedTime && (
            <p className="text-xs text-blue-600 mt-1">
              Proposed: {new Date(req.proposedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {(() => { const [h, m] = req.proposedTime.split(':').map(Number); const d = new Date(); d.setHours(h!, m!); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); })()}
            </p>
          )}
          {req.reviewNote && <p className="text-xs text-gray-400 mt-1">Note: {req.reviewNote}</p>}
          <p className="text-xs text-gray-300 mt-1.5">By {req.requestedBy.name} · {new Date(req.createdAt).toLocaleDateString()}</p>
        </div>
        {isPending && onReview && (
          <button onClick={onReview} className="flex-shrink-0 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
            Review
          </button>
        )}
      </div>
    </div>
  );
}
