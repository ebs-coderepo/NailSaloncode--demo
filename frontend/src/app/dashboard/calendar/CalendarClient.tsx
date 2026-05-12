'use client';

import { useState, useTransition, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Appointment = {
  id: string; startTime: string; endTime: string;
  status: string; customer: string; service: string;
  staff: string; staffId: string; bookedVia: string;
};
type BlockedTime = {
  id: string; startTime: string; endTime: string;
  reason: string | null; staff: string; staffId: string;
};
type Override = {
  id: string; date: string; isWorking: boolean;
  note: string | null; staff: string; staffId: string;
};
type StaffMember = { id: string; name: string };

type CalendarData = {
  year: number; month: number;
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  overrides: Override[];
  staffList: StaffMember[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function daysInMonth(year: number, month: number) { // month 1-indexed
  return new Date(year, month, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}
function toLocalDateString(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
function isoToDateKey(isoString: string) {
  return isoString.split('T')[0]; // "YYYY-MM-DD"
}
function padDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function fetchCalendar(token: string, year: number, month: number, staffId?: string) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (staffId) params.set('staffId', staffId);
  return fetch(`/api/v1/admin/calendar?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarClient({
  initialData,
  role,
  staffId,
  token,
}: {
  initialData: CalendarData | null;
  role: string;
  staffId: string | null;
  token: string;
}) {
  const now = new Date();
  const [data, setData]          = useState<CalendarData | null>(initialData);
  const [year, setYear]          = useState(initialData?.year  ?? now.getFullYear());
  const [month, setMonth]        = useState(initialData?.month ?? now.getMonth() + 1);
  const [viewMode, setViewMode]  = useState<'all' | 'personal'>('personal');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [blockModal, setBlockModal]   = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [error, setError]        = useState<string | null>(null);
  const [isPending, start]       = useTransition();

  const isStaff   = role === 'STAFF';
  // STAFF is always in personal mode; OWNER/MANAGER can toggle
  const filterStaffId = isStaff
    ? staffId ?? undefined
    : viewMode === 'personal' ? staffId ?? undefined : undefined;

  // Re-fetch when month/year/viewMode changes
  useEffect(() => {
    start(async () => {
      const json = await fetchCalendar(token, year, month, filterStaffId);
      if (json.success) setData(json.data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, viewMode]);

  // Build a map: "YYYY-MM-DD" → { appointments[], blocks[], overrides[] }
  type DayData = { appointments: Appointment[]; blocks: BlockedTime[]; overrides: Override[] };
  const dayMap = new Map<string, DayData>();

  data?.appointments.forEach((a) => {
    const key = isoToDateKey(a.startTime);
    const d   = dayMap.get(key) ?? { appointments: [], blocks: [], overrides: [] };
    d.appointments.push(a);
    dayMap.set(key, d);
  });
  data?.blockedTimes.forEach((b) => {
    const key = isoToDateKey(b.startTime);
    const d   = dayMap.get(key) ?? { appointments: [], blocks: [], overrides: [] };
    d.blocks.push(b);
    dayMap.set(key, d);
  });
  data?.overrides.forEach((o) => {
    const d = dayMap.get(o.date) ?? { appointments: [], blocks: [], overrides: [] };
    d.overrides.push(o);
    dayMap.set(o.date, d);
  });

  const totalDays  = daysInMonth(year, month);
  const startDay   = firstDayOfMonth(year, month);
  const todayKey   = padDate(now.getFullYear(), now.getMonth() + 1, now.getDate());

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const selectedDayData = selectedDay ? dayMap.get(selectedDay) : null;

  async function deleteBlock(id: string) {
    setError(null);
    const res = await fetch(`/api/v1/admin/calendar/blocks/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) { setError(json.message); return; }
    const json2 = await fetchCalendar(token, year, month, filterStaffId);
    if (json2.success) setData(json2.data);
  }

  async function deleteOverride(id: string) {
    setError(null);
    const res = await fetch(`/api/v1/admin/calendar/overrides/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) { setError(json.message); return; }
    const json2 = await fetchCalendar(token, year, month, filterStaffId);
    if (json2.success) setData(json2.data);
  }

  async function refreshData() {
    const json = await fetchCalendar(token, year, month, filterStaffId);
    if (json.success) setData(json.data);
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isStaff ? 'My Calendar' : 'Calendar'}
          </h1>
          <p className="text-gray-500 mt-1">
            {MONTHS[month - 1]} {year}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle — OWNER/MANAGER only */}
          {!isStaff && staffId && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('personal')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'personal' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                My Schedule
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Staff
              </button>
            </div>
          )}

          {/* Add actions */}
          <button
            onClick={() => setBlockModal(true)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + Add Break
          </button>
          <button
            onClick={() => setHolidayModal(true)}
            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
          >
            + Add Holiday
          </button>

          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 card p-3 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* ── Calendar grid ─────────────────────────────────────────────────── */}
        <div className={`flex-1 card overflow-hidden ${isPending ? 'opacity-60' : ''}`}>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50/50" />
            ))}

            {/* Day cells */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day     = i + 1;
              const dateKey = padDate(year, month, day);
              const dayData = dayMap.get(dateKey);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDay;
              const hasHoliday = dayData?.overrides.some((o) => !o.isWorking);
              const apptCount  = dayData?.appointments.length ?? 0;
              const blockCount = dayData?.blocks.length ?? 0;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                  className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors
                    ${isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'}
                    ${hasHoliday ? 'bg-red-50' : ''}
                  `}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1
                    ${isToday ? 'bg-brand-600 text-white' : 'text-gray-700'}
                  `}>
                    {day}
                  </div>

                  {hasHoliday && (
                    <div className="text-xs bg-red-100 text-red-700 rounded px-1 py-0.5 mb-0.5 truncate">
                      🏖 Off
                    </div>
                  )}
                  {apptCount > 0 && (
                    <div className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 mb-0.5">
                      {apptCount} appt{apptCount > 1 ? 's' : ''}
                    </div>
                  )}
                  {blockCount > 0 && (
                    <div className="text-xs bg-amber-100 text-amber-700 rounded px-1 py-0.5">
                      {blockCount} block{blockCount > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail panel ──────────────────────────────────────────────── */}
        {selectedDay && (
          <div className="w-72 flex-shrink-0 card p-4 h-fit sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'short', day: 'numeric',
                })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {(!selectedDayData || (
              selectedDayData.appointments.length === 0 &&
              selectedDayData.blocks.length === 0 &&
              selectedDayData.overrides.length === 0
            )) && (
              <p className="text-xs text-gray-400 text-center py-4">Nothing scheduled</p>
            )}

            {/* Holidays / overrides */}
            {selectedDayData?.overrides.map((o) => (
              <div key={o.id} className="mb-2 p-2 rounded-lg bg-red-50 border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-red-700">
                      {o.isWorking ? '🕒 Schedule Override' : '🏖 Day Off'}
                    </p>
                    <p className="text-xs text-red-600">{o.staff}</p>
                    {o.note && <p className="text-xs text-red-500 mt-0.5">{o.note}</p>}
                  </div>
                  <button onClick={() => deleteOverride(o.id)} className="text-red-300 hover:text-red-600">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Blocked times */}
            {selectedDayData?.blocks.map((b) => (
              <div key={b.id} className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-700">⏸ Break / Block</p>
                    <p className="text-xs text-amber-600">{b.staff}</p>
                    <p className="text-xs text-amber-500">
                      {new Date(b.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {' → '}
                      {new Date(b.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                    {b.reason && <p className="text-xs text-amber-500 mt-0.5">{b.reason}</p>}
                  </div>
                  <button onClick={() => deleteBlock(b.id)} className="text-amber-300 hover:text-amber-600">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Appointments */}
            {selectedDayData?.appointments.map((a) => (
              <div key={a.id} className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700">
                  {new Date(a.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' · '}{a.service}
                </p>
                <p className="text-xs text-blue-600">{a.customer}</p>
                <p className="text-xs text-blue-500">{a.staff}</p>
                {a.bookedVia === 'voice' && <p className="text-xs text-blue-400">🎙 Voice AI</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Break Modal ───────────────────────────────────────────────────── */}
      {blockModal && (
        <AddBlockModal
          staffList={data?.staffList ?? []}
          defaultStaffId={staffId ?? undefined}
          isStaff={isStaff}
          token={token}
          selectedDay={selectedDay}
          onSaved={() => { setBlockModal(false); refreshData(); }}
          onClose={() => setBlockModal(false)}
        />
      )}

      {/* ── Add Holiday Modal ─────────────────────────────────────────────────── */}
      {holidayModal && (
        <AddHolidayModal
          staffList={data?.staffList ?? []}
          defaultStaffId={staffId ?? undefined}
          isStaff={isStaff}
          token={token}
          selectedDay={selectedDay}
          onSaved={() => { setHolidayModal(false); refreshData(); }}
          onClose={() => setHolidayModal(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Break Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddBlockModal({
  staffList, defaultStaffId, isStaff, token, selectedDay, onSaved, onClose,
}: {
  staffList: StaffMember[];
  defaultStaffId?: string;
  isStaff: boolean;
  token: string;
  selectedDay: string | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const today = selectedDay ?? new Date().toISOString().split('T')[0];
  const [staffId,   setStaffId]   = useState(defaultStaffId ?? staffList[0]?.id ?? '');
  const [date,      setDate]      = useState(today);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime,   setEndTime]   = useState('13:00');
  const [reason,    setReason]    = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, start]        = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch('/api/v1/admin/calendar/blocks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          staffId,
          startTime: `${date}T${startTime}:00.000Z`,
          endTime:   `${date}T${endTime}:00.000Z`,
          reason:    reason || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      onSaved();
    });
  }

  return (
    <Modal title="Add Break / Block" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {!isStaff && staffList.length > 0 && (
          <Field label="Staff Member">
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="input">
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}

        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" required />
          </Field>
          <Field label="End time">
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" required />
          </Field>
        </div>

        <Field label="Reason (optional)">
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lunch, meeting…" className="input" />
        </Field>

        <ModalFooter onClose={onClose} isPending={isPending} submitLabel="Add Break" />
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Holiday Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddHolidayModal({
  staffList, defaultStaffId, isStaff, token, selectedDay, onSaved, onClose,
}: {
  staffList: StaffMember[];
  defaultStaffId?: string;
  isStaff: boolean;
  token: string;
  selectedDay: string | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const today = selectedDay ?? new Date().toISOString().split('T')[0];
  const [staffId, setStaffId] = useState(defaultStaffId ?? staffList[0]?.id ?? '');
  const [date,    setDate]    = useState(today);
  const [note,    setNote]    = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch('/api/v1/admin/calendar/overrides', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staffId, date, isWorking: false, note: note || undefined }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      onSaved();
    });
  }

  return (
    <Modal title="Mark Day Off / Holiday" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {!isStaff && staffList.length > 0 && (
          <Field label="Staff Member">
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="input">
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}

        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
        </Field>

        <Field label="Note (optional)">
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Public holiday, sick leave…" className="input" />
        </Field>

        <ModalFooter onClose={onClose} isPending={isPending} submitLabel="Mark as Day Off" />
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onClose, isPending, submitLabel }: { onClose: () => void; isPending: boolean; submitLabel: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
        {isPending ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
