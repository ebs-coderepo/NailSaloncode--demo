'use client';

import { useState, useEffect, useCallback } from 'react';

type Service = { id: string; name: string; description: string | null; duration: number; durationDisplay: string; price: string };
type StaffMember = { id: string; name: string; bio: string | null; serviceIds: string[]; experienceYears: number | null; specialties: string | null; averageRating: number | null; ratingCount: number };
type Salon = { bookingNotesEnabled: boolean; bookingMaxDaysAhead: number; businessHours: Record<string, { open: string; close: string } | null> | null; name: string };
type SlotResult = { time: string; staff: { id: string; name: string }[] };

type Props = {
  services: Service[];
  staff: StaffMember[];
  salon: Salon;
  slug: string;
  isDark: boolean;
};

const STEPS = ['Service', 'Date', 'Time', 'Details', 'Confirm'];

const SLUG = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SALON_SLUG ?? 'luxe-nails') : 'luxe-nails';

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function dayOfWeek(dateStr: string) { const [y, m, d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d).getDay(); }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_SHORT   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function BookingFlow({ services, staff, salon, slug, isDark }: Props) {
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate]     = useState('');
  const [selectedTime, setSelectedTime]     = useState('');
  const [selectedStaff, setSelectedStaff]   = useState<{ id: string; name: string } | null>(null);
  const [availableStaff, setAvailableStaff] = useState<{ id: string; name: string }[]>([]);
  const [slots, setSlots]     = useState<SlotResult[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [notes, setNotes]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [error, setError]     = useState('');

  // Calendar state
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Pre-select service from query param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('serviceId');
    if (sid) {
      const svc = services.find((s) => s.id === sid);
      if (svc) { setSelectedService(svc); setStep(1); }
    }
  }, [services]);

  // Fetch availability when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedTime('');
    setSelectedStaff(null);
    fetch(`/api/v1/public/${slug}/availability?serviceId=${selectedService.id}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setSlots(json.data.slots); })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedService, slug]);

  function selectSlot(slot: SlotResult) {
    setSelectedTime(slot.time);
    setAvailableStaff(slot.staff);
    // Auto-select "any" (first available)
    setSelectedStaff({ id: slot.staff[0].id, name: slot.staff.length === 1 ? slot.staff[0].name : 'Any available' });
  }

  function isDateDisabled(dateStr: string): boolean {
    const today = isoDate(new Date());
    if (dateStr < today) return true;
    const maxDate = isoDate(addDays(new Date(), salon.bookingMaxDaysAhead));
    if (dateStr > maxDate) return true;
    if (!salon.businessHours) return false;
    const dow = dayOfWeek(dateStr);
    const hours = (salon.businessHours as any)[String(dow)];
    return !hours;
  }

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime || !selectedStaff) return;
    if (!customer.name.trim() || !customer.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Resolve actual staff ID (pick first if "any")
      const staffId = availableStaff.length === 1 ? availableStaff[0].id : (selectedStaff?.id ?? availableStaff[0]?.id);
      const res = await fetch(`/api/v1/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          staffId,
          date: selectedDate,
          time: selectedTime,
          customer: { name: customer.name.trim(), phone: customer.phone.trim(), email: customer.email.trim() || null },
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfirmation(json.data);
      } else {
        setError(json.message ?? 'Booking failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (confirmation) {
    return (
      <div className={`rounded-3xl p-10 text-center border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-100 text-green-600 text-3xl">✓</div>
        <h2 className="text-2xl font-bold mb-2">You&apos;re booked!</h2>
        <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          We&apos;ll see you soon. A summary of your appointment:
        </p>
        <div className={`rounded-2xl p-6 text-left space-y-3 mb-8 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <BookingRow label="Service"  value={confirmation.service.name} />
          <BookingRow label="Staff"    value={confirmation.staff.name} />
          <BookingRow label="Date"     value={new Date(confirmation.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
          <BookingRow label="Time"     value={new Date(confirmation.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} />
          <BookingRow label="Duration" value={`${confirmation.service.duration} min`} />
          <BookingRow label="Price"    value={confirmation.service.price} />
        </div>
        <a href="/" className="pub-btn-primary px-8 py-3 rounded-xl font-semibold inline-block">
          Back to Home
        </a>
      </div>
    );
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${
              i < step ? 'pub-step-done' : i === step ? 'pub-step-active' : isDark ? 'border-gray-600 text-gray-500' : 'border-gray-200 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'pub-accent' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`w-6 sm:w-10 h-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Select Service ── */}
      {step === 0 && (
        <StepCard title="Choose a Service" isDark={isDark}>
          <div className="grid gap-3">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => { setSelectedService(svc); setStep(1); }}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${isDark ? 'border-gray-700 hover:border-gray-500 bg-gray-800/50' : 'border-gray-100 hover:border-gray-300 bg-white'} ${selectedService?.id === svc.id ? 'pub-card-selected' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{svc.name}</p>
                    {svc.description && <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{svc.description}</p>}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="pub-accent font-bold">{svc.price}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{svc.durationDisplay}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {/* ── Step 1: Select Date ── */}
      {step === 1 && selectedService && (
        <StepCard title="Pick a Date" subtitle={`Booking: ${selectedService.name}`} isDark={isDark}>
          {/* Mini calendar */}
          <div className={`rounded-2xl border p-4 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >‹</button>
              <span className="font-semibold">{MONTH_NAMES[calMonth]} {calYear}</span>
              <button
                onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_SHORT.map((d) => <div key={d} className={`text-center text-xs font-medium py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{d}</div>)}
            </div>
            <CalendarGrid
              year={calYear}
              month={calMonth}
              selected={selectedDate}
              isDisabled={isDateDisabled}
              onSelect={(d) => { setSelectedDate(d); setStep(2); }}
              isDark={isDark}
            />
          </div>
          <NavButtons onBack={() => setStep(0)} backLabel="Change Service" hideNext isDark={isDark} />
        </StepCard>
      )}

      {/* ── Step 2: Select Time ── */}
      {step === 2 && selectedService && selectedDate && (
        <StepCard
          title="Pick a Time"
          subtitle={`${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          isDark={isDark}
        >
          {loadingSlots ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
              <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Checking availability…</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-10">
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No available slots on this date.</p>
              <button onClick={() => setStep(1)} className="pub-accent font-medium text-sm mt-3 hover:underline">Choose another date</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => selectSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all pub-slot-available ${
                      selectedTime === slot.time ? 'pub-slot-selected' : isDark ? 'border-gray-700 text-gray-300 bg-gray-800/50' : 'border-gray-200 text-gray-700 bg-white'
                    }`}
                  >
                    {formatTime12(slot.time)}
                  </button>
                ))}
              </div>

              {/* Staff selection (if multiple staff for chosen slot) */}
              {selectedTime && availableStaff.length > 1 && (
                <div className="mt-6">
                  <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Choose a technician (optional)</p>
                  <div className="grid gap-2">
                    <button
                      onClick={() => setSelectedStaff({ id: availableStaff[0].id, name: 'Any available' })}
                      className={`text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
                        selectedStaff?.name === 'Any available' ? 'pub-card-selected border-2' : isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-white'
                      }`}
                    >
                      <span className="font-medium">Any available</span>
                    </button>
                    {availableStaff.map((s) => {
                      const fullStaff = staff.find((sm) => sm.id === s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStaff(s)}
                          className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                            selectedStaff?.id === s.id && selectedStaff?.name !== 'Any available' ? 'pub-card-selected border-2' : isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">{s.name}</p>
                              {fullStaff?.specialties && (
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fullStaff.specialties}</p>
                              )}
                              {fullStaff?.experienceYears != null && (
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{fullStaff.experienceYears} yr{fullStaff.experienceYears !== 1 ? 's' : ''} experience</p>
                              )}
                            </div>
                            {fullStaff?.averageRating != null && fullStaff.ratingCount > 0 && (
                              <div className="text-right shrink-0">
                                <span className="text-yellow-400 text-sm">★</span>
                                <span className={`text-sm font-medium ml-0.5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{fullStaff.averageRating.toFixed(1)}</span>
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{fullStaff.ratingCount} review{fullStaff.ratingCount !== 1 ? 's' : ''}</p>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <NavButtons
                onBack={() => { setStep(1); setSelectedTime(''); setSelectedStaff(null); }}
                onNext={() => setStep(3)}
                nextDisabled={!selectedTime || !selectedStaff}
                isDark={isDark}
              />
            </>
          )}
        </StepCard>
      )}

      {/* ── Step 3: Your Details ── */}
      {step === 3 && (
        <StepCard title="Your Details" isDark={isDark}>
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Full Name *</label>
              <input
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'}`}
                style={{ '--tw-ring-color': 'var(--primary)' } as any}
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number *</label>
              <input
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'}`}
                value={customer.phone}
                onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                placeholder="+1 212 555 0100"
                type="tel"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>(optional)</span></label>
              <input
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'}`}
                value={customer.email}
                onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                placeholder="jane@example.com"
                type="email"
              />
            </div>
            {salon.bookingNotesEnabled && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>(optional)</span></label>
                <textarea
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'}`}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any preferences, allergies, or special requests…"
                />
              </div>
            )}
          </div>
          <NavButtons onBack={() => { setStep(2); setError(''); }} onNext={() => { if (!customer.name.trim() || !customer.phone.trim()) { setError('Name and phone are required.'); return; } setError(''); setStep(4); }} isDark={isDark} />
        </StepCard>
      )}

      {/* ── Step 4: Confirm ── */}
      {step === 4 && selectedService && selectedDate && selectedTime && selectedStaff && (
        <StepCard title="Confirm Your Booking" isDark={isDark}>
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
          <div className={`rounded-2xl p-6 space-y-3 mb-6 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50'}`}>
            <BookingRow label="Service"  value={`${selectedService.name} (${selectedService.durationDisplay})`} />
            <BookingRow label="Price"    value={selectedService.price} />
            <BookingRow label="Date"     value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
            <BookingRow label="Time"     value={formatTime12(selectedTime)} />
            <BookingRow label="Staff"    value={selectedStaff.name} />
            <BookingRow label="Name"     value={customer.name} />
            <BookingRow label="Phone"    value={customer.phone} />
            {customer.email && <BookingRow label="Email" value={customer.email} />}
            {notes && <BookingRow label="Notes" value={notes} />}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${isDark ? 'border-gray-600 text-gray-300 hover:border-gray-400' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}
              disabled={submitting}
            >
              Edit
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 pub-btn-primary py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        </StepCard>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepCard({ title, subtitle, children, isDark }: { title: string; subtitle?: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div className={`rounded-3xl border p-6 sm:p-8 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
      <h2 className="text-xl font-bold mb-1">{title}</h2>
      {subtitle && <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </div>
  );
}

function NavButtons({ onBack, onNext, backLabel, nextLabel, hideNext, nextDisabled, isDark }: {
  onBack: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  hideNext?: boolean;
  nextDisabled?: boolean;
  isDark: boolean;
}) {
  return (
    <div className="flex gap-3 mt-6">
      <button
        onClick={onBack}
        className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${isDark ? 'border-gray-600 text-gray-300 hover:border-gray-400' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}
      >
        {backLabel ?? '← Back'}
      </button>
      {!hideNext && onNext && (
        <button
          onClick={onNext}
          className="flex-1 pub-btn-primary py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
          disabled={nextDisabled}
        >
          {nextLabel ?? 'Next →'}
        </button>
      )}
    </div>
  );
}

function BookingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="font-medium text-gray-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function CalendarGrid({ year, month, selected, isDisabled, onSelect, isDark }: {
  year: number;
  month: number;
  selected: string;
  isDisabled: (d: string) => boolean;
  onSelect: (d: string) => void;
  isDark: boolean;
}) {
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((d, i) => {
        if (!d) return <div key={i} />;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const disabled = isDisabled(dateStr);
        const isSelected = dateStr === selected;
        return (
          <button
            key={i}
            onClick={() => !disabled && onSelect(dateStr)}
            disabled={disabled}
            className={`h-9 w-full rounded-lg text-sm font-medium transition-all ${
              isSelected
                ? 'pub-slot-selected'
                : disabled
                ? isDark ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                : isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}
