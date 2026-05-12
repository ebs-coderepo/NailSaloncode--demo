'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api.client';

type DayHours = { open: string; close: string } | null;
type BusinessHours = Record<string, DayHours>;

type GalleryImage = { url: string; caption: string; order: number };

type Settings = {
  id: string; name: string; slug: string;
  phone: string | null; email: string | null;
  address: string | null; timezone: string;
  tagline: string | null; logoUrl: string | null;
  coverImageUrl: string | null; primaryColor: string; theme: string;
  socialInstagram: string | null; socialFacebook: string | null; socialWebsite: string | null;
  businessHours: BusinessHours | null;
  bookingEnabled: boolean; bookingNotesEnabled: boolean;
  bookingLeadMinutes: number; bookingMaxDaysAhead: number;
  siteEnabled: boolean;
  galleryImages: GalleryImage[] | null;
  reviewsEnabled: boolean; reviewsAutoApprove: boolean; reviewsShowRating: boolean;
  updatedAt: string;
};

type Props = { initialSettings: Settings | null; role: string };

// ─────────────────────────────────────────────────────────────────────────────
// Preset color themes
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: 'Rose',    color: '#db2777' },
  { name: 'Pink',    color: '#ec4899' },
  { name: 'Violet',  color: '#7c3aed' },
  { name: 'Indigo',  color: '#4338ca' },
  { name: 'Blue',    color: '#2563eb' },
  { name: 'Teal',    color: '#0d9488' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Amber',   color: '#d97706' },
  { name: 'Orange',  color: '#ea580c' },
  { name: 'Red',     color: '#dc2626' },
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Dubai',
  'Australia/Sydney', 'Australia/Melbourne',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS: BusinessHours = {
  '0': null,
  '1': { open: '09:00', close: '19:00' },
  '2': { open: '09:00', close: '19:00' },
  '3': { open: '09:00', close: '19:00' },
  '4': { open: '09:00', close: '19:00' },
  '5': { open: '09:00', close: '19:00' },
  '6': { open: '09:00', close: '15:00' },
};

const TABS = ['Salon Info', 'Branding', 'Business Hours', 'Social & Links', 'Booking', 'Site & Gallery', 'Reviews', 'Payments'];

export default function SettingsClient({ initialSettings, role }: Props) {
  const settings = initialSettings;
  const isOwner  = role === 'OWNER';

  const [activeTab, setActiveTab] = useState(0);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // ── Form state ─────────────────────────────────────────────────────────────
  const [info, setInfo] = useState({
    name:     settings?.name     ?? '',
    tagline:  settings?.tagline  ?? '',
    phone:    settings?.phone    ?? '',
    email:    settings?.email    ?? '',
    address:  settings?.address  ?? '',
    timezone: settings?.timezone ?? 'America/New_York',
  });

  const [branding, setBranding] = useState({
    primaryColor:   settings?.primaryColor   ?? '#db2777',
    theme:          settings?.theme          ?? 'light',
    logoUrl:        settings?.logoUrl        ?? '',
    coverImageUrl:  settings?.coverImageUrl  ?? '',
  });

  const [hours, setHours] = useState<BusinessHours>(
    (settings?.businessHours as BusinessHours) ?? DEFAULT_HOURS
  );

  const [social, setSocial] = useState({
    socialInstagram: settings?.socialInstagram ?? '',
    socialFacebook:  settings?.socialFacebook  ?? '',
    socialWebsite:   settings?.socialWebsite   ?? '',
  });

  const [booking, setBooking] = useState({
    bookingEnabled:      settings?.bookingEnabled      ?? true,
    bookingNotesEnabled: settings?.bookingNotesEnabled ?? true,
    bookingLeadMinutes:  settings?.bookingLeadMinutes  ?? 60,
    bookingMaxDaysAhead: settings?.bookingMaxDaysAhead ?? 30,
  });

  const [site, setSite] = useState({
    siteEnabled: settings?.siteEnabled ?? true,
  });

  const [gallery, setGallery] = useState<GalleryImage[]>(
    (settings?.galleryImages as GalleryImage[]) ?? []
  );

  const [reviews, setReviewSettings] = useState({
    reviewsEnabled:     settings?.reviewsEnabled     ?? true,
    reviewsAutoApprove: settings?.reviewsAutoApprove ?? true,
    reviewsShowRating:  settings?.reviewsShowRating  ?? true,
  });

  // Payment config state (loaded separately)
  const [payConfig, setPayConfig] = useState<{
    isEnabled: boolean; currency: string; acceptCash: boolean;
    stripePublishableKey: string | null; stripeConfigured: boolean;
    squareConfigured: boolean; paypalConfigured: boolean;
  } | null>(null);
  const [payConfigLoaded, setPayConfigLoaded] = useState(false);
  const [payForm, setPayForm] = useState({
    isEnabled: false, currency: 'USD', acceptCash: true,
    stripePublishableKey: '', stripeSecretKey: '', stripeWebhookSecret: '',
    squareAccessToken: '', squareLocationId: '',
    paypalClientId: '', paypalClientSecret: '',
  });
  const [paySaving, setPaySaving] = useState(false);
  const [paySaved, setPaySaved] = useState(false);
  const [payError, setPayError] = useState('');

  // ── Gallery helpers ─────────────────────────────────────────────────────────
  function addGalleryImage() {
    setGallery((g) => [...g, { url: '', caption: '', order: g.length }]);
  }
  function removeGalleryImage(i: number) {
    setGallery((g) => g.filter((_, idx) => idx !== i).map((img, idx) => ({ ...img, order: idx })));
  }
  function updateGalleryImage(i: number, field: keyof GalleryImage, value: string | number) {
    setGallery((g) => g.map((img, idx) => idx === i ? { ...img, [field]: value } : img));
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!isOwner) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const payload: Record<string, any> = {
        // Info
        name:     info.name.trim()    || undefined,
        tagline:  info.tagline.trim() || null,
        phone:    info.phone.trim()   || null,
        email:    info.email.trim()   || null,
        address:  info.address.trim() || null,
        timezone: info.timezone,
        // Branding
        primaryColor:  branding.primaryColor,
        theme:         branding.theme,
        logoUrl:       branding.logoUrl.trim()       || null,
        coverImageUrl: branding.coverImageUrl.trim() || null,
        // Social
        socialInstagram: social.socialInstagram.trim() || null,
        socialFacebook:  social.socialFacebook.trim()  || null,
        socialWebsite:   social.socialWebsite.trim()   || null,
        // Hours
        businessHours: hours,
        // Booking
        ...booking,
        // Site
        ...site,
        galleryImages: gallery.filter((img) => img.url.trim()),
        // Reviews
        ...reviews,
      };

      const res = await apiFetch<Settings>('/api/v1/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function loadPayConfig() {
    if (payConfigLoaded) return;
    const res = await apiFetch<typeof payConfig>('/api/v1/admin/payments/config');
    if (res.success && res.data) {
      setPayConfig(res.data);
      setPayForm((f) => ({
        ...f,
        isEnabled: res.data!.isEnabled,
        currency:  res.data!.currency,
        acceptCash: res.data!.acceptCash,
        stripePublishableKey: res.data!.stripePublishableKey ?? '',
      }));
    }
    setPayConfigLoaded(true);
  }

  async function handleSavePayConfig() {
    if (!isOwner) return;
    setPaySaving(true); setPaySaved(false); setPayError('');
    const payload: Record<string, any> = {
      isEnabled:  payForm.isEnabled,
      currency:   payForm.currency,
      acceptCash: payForm.acceptCash,
    };
    if (payForm.stripePublishableKey) payload['stripePublishableKey'] = payForm.stripePublishableKey;
    if (payForm.stripeSecretKey)      payload['stripeSecretKey']      = payForm.stripeSecretKey;
    if (payForm.stripeWebhookSecret)  payload['stripeWebhookSecret']  = payForm.stripeWebhookSecret;
    if (payForm.squareAccessToken)    payload['squareAccessToken']    = payForm.squareAccessToken;
    if (payForm.squareLocationId)     payload['squareLocationId']     = payForm.squareLocationId;
    if (payForm.paypalClientId)       payload['paypalClientId']       = payForm.paypalClientId;
    if (payForm.paypalClientSecret)   payload['paypalClientSecret']   = payForm.paypalClientSecret;

    const res = await apiFetch('/api/v1/admin/payments/config', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setPaySaving(false);
    if (res.success) {
      setPaySaved(true);
      setTimeout(() => setPaySaved(false), 3000);
    } else {
      setPayError(res.message);
    }
  }

  if (!settings) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <div className="card p-8 text-center text-gray-500">Unable to load settings.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your salon&apos;s profile, branding, and booking experience.</p>
        </div>
        {isOwner && (
          <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[120px]">
            {saving ? 'Saving…' : 'Save All'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-4">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg mb-4">Settings saved successfully.</p>}
      {!isOwner && <p className="text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-lg mb-4">You are viewing settings. Only the owner can make changes.</p>}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(i); if (i === 7) loadPayConfig(); }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === i
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Salon Info ── */}
      {activeTab === 0 && (
        <div className="card p-6 space-y-5">
          <Field label="Salon Name *" disabled={!isOwner}>
            <input className="input" value={info.name} onChange={(e) => setInfo((f) => ({ ...f, name: e.target.value }))} disabled={!isOwner} placeholder="Luxe Nails & Spa" />
          </Field>
          <Field label="Tagline" disabled={!isOwner} hint="Shown below your salon name on the public site">
            <input className="input" value={info.tagline} onChange={(e) => setInfo((f) => ({ ...f, tagline: e.target.value }))} disabled={!isOwner} placeholder="Your luxury nail experience" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" disabled={!isOwner}>
              <input className="input" value={info.phone} onChange={(e) => setInfo((f) => ({ ...f, phone: e.target.value }))} disabled={!isOwner} placeholder="+1 212 555 0100" />
            </Field>
            <Field label="Email" disabled={!isOwner}>
              <input className="input" type="email" value={info.email} onChange={(e) => setInfo((f) => ({ ...f, email: e.target.value }))} disabled={!isOwner} placeholder="hello@luxenails.com" />
            </Field>
          </div>
          <Field label="Address" disabled={!isOwner}>
            <textarea className="input" rows={2} value={info.address} onChange={(e) => setInfo((f) => ({ ...f, address: e.target.value }))} disabled={!isOwner} placeholder="123 Fifth Ave, New York, NY 10001" />
          </Field>
          <Field label="Timezone" disabled={!isOwner}>
            <select className="input" value={info.timezone} onChange={(e) => setInfo((f) => ({ ...f, timezone: e.target.value }))} disabled={!isOwner}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Salon slug: <span className="font-mono">{settings.slug}</span> · Last saved {new Date(settings.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* ── Tab 1: Branding ── */}
      {activeTab === 1 && (
        <div className="space-y-5">
          {/* Color theme */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Brand Color</h3>
            <p className="text-sm text-gray-500 mb-4">Applied to buttons, links, and accents on your public booking site.</p>
            <div className="flex flex-wrap gap-3 mb-4">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.color}
                  title={preset.name}
                  onClick={() => isOwner && setBranding((b) => ({ ...b, primaryColor: preset.color }))}
                  className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 ${branding.primaryColor === preset.color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: preset.color }}
                  disabled={!isOwner}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Custom:</label>
                <div className="relative">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => isOwner && setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                    disabled={!isOwner}
                  />
                </div>
              </div>
              <input
                className="input max-w-[120px] font-mono text-sm"
                value={branding.primaryColor}
                onChange={(e) => isOwner && /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                disabled={!isOwner}
                placeholder="#db2777"
              />
              <div className="w-10 h-10 rounded-lg border border-gray-200" style={{ backgroundColor: branding.primaryColor }} />
            </div>
          </div>

          {/* Site theme */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Site Theme</h3>
            <p className="text-sm text-gray-500 mb-4">Controls the light/dark appearance of your public booking site.</p>
            <div className="flex gap-3">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => isOwner && setBranding((b) => ({ ...b, theme: t }))}
                  className={`flex-1 py-4 rounded-xl border-2 text-sm font-medium transition-all ${branding.theme === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  disabled={!isOwner}
                >
                  {t === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              ))}
            </div>
          </div>

          {/* Logo & Images */}
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-1">Logo & Images</h3>
            <p className="text-sm text-gray-500 mb-3">Paste hosted image URLs (Cloudinary, Imgur, etc.).</p>
            <Field label="Logo URL" disabled={!isOwner} hint="Small circular logo shown in the nav">
              <input className="input" value={branding.logoUrl} onChange={(e) => setBranding((b) => ({ ...b, logoUrl: e.target.value }))} disabled={!isOwner} placeholder="https://example.com/logo.png" />
              {branding.logoUrl && <img src={branding.logoUrl} alt="Logo preview" className="mt-2 w-12 h-12 rounded-full object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            </Field>
            <Field label="Cover Image URL" disabled={!isOwner} hint="Full-width hero background on the landing page">
              <input className="input" value={branding.coverImageUrl} onChange={(e) => setBranding((b) => ({ ...b, coverImageUrl: e.target.value }))} disabled={!isOwner} placeholder="https://example.com/cover.jpg" />
              {branding.coverImageUrl && <img src={branding.coverImageUrl} alt="Cover preview" className="mt-2 w-full h-24 rounded-lg object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            </Field>
          </div>

          {/* Preview link */}
          <div className={`text-center py-4`}>
            <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline">
              Preview public site →
            </a>
          </div>
        </div>
      )}

      {/* ── Tab 2: Business Hours ── */}
      {activeTab === 2 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Business Hours</h3>
          <p className="text-sm text-gray-500 mb-5">These hours appear on your public site and control which days customers can book online.</p>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const dayHours = hours[String(day)];
              const isOpen   = !!dayHours;
              return (
                <div key={day} className={`flex items-center gap-4 py-3 px-4 rounded-xl border ${isOpen ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="w-28 shrink-0">
                    <p className="font-medium text-sm text-gray-900">{DAY_NAMES[day]}</p>
                  </div>
                  <Toggle
                    checked={isOpen}
                    onChange={(v) => {
                      if (!isOwner) return;
                      setHours((h) => ({
                        ...h,
                        [String(day)]: v ? { open: '09:00', close: '19:00' } : null,
                      }));
                    }}
                    disabled={!isOwner}
                  />
                  {isOpen && dayHours ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        className="input max-w-[110px] text-sm"
                        value={dayHours.open}
                        onChange={(e) => isOwner && setHours((h) => ({ ...h, [String(day)]: { ...dayHours, open: e.target.value } }))}
                        disabled={!isOwner}
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="time"
                        className="input max-w-[110px] text-sm"
                        value={dayHours.close}
                        onChange={(e) => isOwner && setHours((h) => ({ ...h, [String(day)]: { ...dayHours, close: e.target.value } }))}
                        disabled={!isOwner}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab 3: Social & Links ── */}
      {activeTab === 3 && (
        <div className="card p-6 space-y-5">
          <h3 className="font-semibold text-gray-900 mb-3">Social Media & Links</h3>
          <Field label="Instagram URL" disabled={!isOwner} hint="e.g. https://instagram.com/yoursalon">
            <input className="input" value={social.socialInstagram} onChange={(e) => setSocial((s) => ({ ...s, socialInstagram: e.target.value }))} disabled={!isOwner} placeholder="https://instagram.com/luxenailsnyc" />
          </Field>
          <Field label="Facebook URL" disabled={!isOwner}>
            <input className="input" value={social.socialFacebook} onChange={(e) => setSocial((s) => ({ ...s, socialFacebook: e.target.value }))} disabled={!isOwner} placeholder="https://facebook.com/luxenails" />
          </Field>
          <Field label="Website URL" disabled={!isOwner} hint="Your existing salon website (if any)">
            <input className="input" value={social.socialWebsite} onChange={(e) => setSocial((s) => ({ ...s, socialWebsite: e.target.value }))} disabled={!isOwner} placeholder="https://luxenails.com" />
          </Field>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Social links appear in the footer of your public booking site.</p>
          </div>
        </div>
      )}

      {/* ── Tab 4: Booking ── */}
      {activeTab === 4 && (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="font-semibold text-gray-900">Enable Online Booking</p>
                <p className="text-sm text-gray-500 mt-0.5">When off, the &quot;Book Now&quot; button is hidden and /book shows a message.</p>
              </div>
              <Toggle checked={booking.bookingEnabled} onChange={(v) => isOwner && setBooking((b) => ({ ...b, bookingEnabled: v }))} disabled={!isOwner} />
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h3 className="font-semibold text-gray-900">Booking Rules</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min. notice (minutes)" hint="How far in advance customers must book" disabled={!isOwner}>
                <select className="input" value={booking.bookingLeadMinutes} onChange={(e) => isOwner && setBooking((b) => ({ ...b, bookingLeadMinutes: Number(e.target.value) }))} disabled={!isOwner}>
                  {[0, 30, 60, 90, 120, 180, 240, 360, 720, 1440].map((m) => (
                    <option key={m} value={m}>{m === 0 ? 'No limit' : m < 60 ? `${m} min` : `${m / 60} hr`}</option>
                  ))}
                </select>
              </Field>
              <Field label="Max. days ahead" hint="How far in future customers can book" disabled={!isOwner}>
                <select className="input" value={booking.bookingMaxDaysAhead} onChange={(e) => isOwner && setBooking((b) => ({ ...b, bookingMaxDaysAhead: Number(e.target.value) }))} disabled={!isOwner}>
                  {[7, 14, 21, 30, 45, 60, 90].map((d) => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="font-medium text-gray-900 text-sm">Allow booking notes</p>
                <p className="text-xs text-gray-500 mt-0.5">Customers can add special requests when booking.</p>
              </div>
              <Toggle checked={booking.bookingNotesEnabled} onChange={(v) => isOwner && setBooking((b) => ({ ...b, bookingNotesEnabled: v }))} disabled={!isOwner} />
            </div>
          </div>

          <div className="text-center">
            <a href="/book" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline">
              Preview booking page →
            </a>
          </div>
        </div>
      )}

      {/* ── Tab 5: Site & Gallery ── */}
      {activeTab === 5 && (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="font-semibold text-gray-900">Enable Public Site</p>
                <p className="text-sm text-gray-500 mt-0.5">When off, your public-facing website is hidden and shows a maintenance notice.</p>
              </div>
              <Toggle checked={site.siteEnabled} onChange={(v) => isOwner && setSite({ siteEnabled: v })} disabled={!isOwner} />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Gallery Images</h3>
                <p className="text-sm text-gray-500">Images shown in the gallery section on your public site. Paste hosted image URLs.</p>
              </div>
              {isOwner && (
                <button onClick={addGalleryImage} className="btn-secondary text-sm">+ Add Image</button>
              )}
            </div>
            {gallery.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-4">No gallery images yet. Add some to showcase your work!</p>
            )}
            <div className="space-y-3">
              {gallery.map((img, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {img.url && (
                      <img
                        src={img.url}
                        alt={img.caption || `Gallery ${i + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        className="input text-sm"
                        placeholder="Image URL (https://...)"
                        value={img.url}
                        onChange={(e) => updateGalleryImage(i, 'url', e.target.value)}
                        disabled={!isOwner}
                      />
                      <input
                        className="input text-sm"
                        placeholder="Caption (optional)"
                        value={img.caption}
                        onChange={(e) => updateGalleryImage(i, 'caption', e.target.value)}
                        disabled={!isOwner}
                      />
                    </div>
                    {isOwner && (
                      <button onClick={() => removeGalleryImage(i)} className="text-red-400 hover:text-red-600 text-sm mt-1 shrink-0">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 6: Reviews ── */}
      {activeTab === 6 && (
        <div className="space-y-5">
          <div className="card p-6 space-y-5">
            <h3 className="font-semibold text-gray-900">Review Settings</h3>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900 text-sm">Enable Reviews</p>
                <p className="text-xs text-gray-500 mt-0.5">Customers can submit reviews, and they appear on your public site.</p>
              </div>
              <Toggle checked={reviews.reviewsEnabled} onChange={(v) => isOwner && setReviewSettings((r) => ({ ...r, reviewsEnabled: v }))} disabled={!isOwner} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900 text-sm">Auto-approve Reviews</p>
                <p className="text-xs text-gray-500 mt-0.5">New reviews are visible immediately. Turn off to moderate before showing.</p>
              </div>
              <Toggle checked={reviews.reviewsAutoApprove} onChange={(v) => isOwner && setReviewSettings((r) => ({ ...r, reviewsAutoApprove: v }))} disabled={!isOwner} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">Show Star Ratings</p>
                <p className="text-xs text-gray-500 mt-0.5">Display star rating numbers alongside review text on the public site.</p>
              </div>
              <Toggle checked={reviews.reviewsShowRating} onChange={(v) => isOwner && setReviewSettings((r) => ({ ...r, reviewsShowRating: v }))} disabled={!isOwner} />
            </div>
          </div>
          <div className="text-center">
            <a href="/dashboard/reviews" className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline">
              Manage & moderate reviews →
            </a>
          </div>
        </div>
      )}

      {/* ── Tab 7: Payments ── */}
      {activeTab === 7 && (
        <div className="space-y-5">
          {payError  && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{payError}</p>}
          {paySaved  && <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg">Payment settings saved.</p>}

          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Payment Settings</h3>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium text-sm text-gray-900">Enable Payments</p>
                <p className="text-xs text-gray-500 mt-0.5">Allow staff to record payments for appointments.</p>
              </div>
              <Toggle checked={payForm.isEnabled} onChange={(v) => isOwner && setPayForm((f) => ({ ...f, isEnabled: v }))} disabled={!isOwner} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium text-sm text-gray-900">Accept Cash</p>
                <p className="text-xs text-gray-500 mt-0.5">Show cash as a payment option.</p>
              </div>
              <Toggle checked={payForm.acceptCash} onChange={(v) => isOwner && setPayForm((f) => ({ ...f, acceptCash: v }))} disabled={!isOwner} />
            </div>

            <Field label="Currency" disabled={!isOwner}>
              <select className="input" value={payForm.currency} onChange={(e) => setPayForm((f) => ({ ...f, currency: e.target.value }))} disabled={!isOwner}>
                {['USD','CAD','GBP','EUR','AUD','INR','SGD','AED'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          {/* Stripe */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Stripe</h3>
              {payConfig?.stripeConfigured && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected</span>}
            </div>
            <Field label="Publishable Key" disabled={!isOwner} hint="Starts with pk_live_ or pk_test_">
              <input className="input" value={payForm.stripePublishableKey} onChange={(e) => setPayForm((f) => ({ ...f, stripePublishableKey: e.target.value }))} disabled={!isOwner} placeholder="pk_live_..." />
            </Field>
            <Field label="Secret Key" disabled={!isOwner} hint="Starts with sk_live_ or sk_test_ — never shared publicly">
              <input type="password" className="input" value={payForm.stripeSecretKey} onChange={(e) => setPayForm((f) => ({ ...f, stripeSecretKey: e.target.value }))} disabled={!isOwner} placeholder="sk_live_..." />
            </Field>
            <Field label="Webhook Secret" disabled={!isOwner} hint="From Stripe webhook dashboard (optional)">
              <input type="password" className="input" value={payForm.stripeWebhookSecret} onChange={(e) => setPayForm((f) => ({ ...f, stripeWebhookSecret: e.target.value }))} disabled={!isOwner} placeholder="whsec_..." />
            </Field>
          </div>

          {/* Square */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Square</h3>
              {payConfig?.squareConfigured && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected</span>}
            </div>
            <Field label="Access Token" disabled={!isOwner}>
              <input type="password" className="input" value={payForm.squareAccessToken} onChange={(e) => setPayForm((f) => ({ ...f, squareAccessToken: e.target.value }))} disabled={!isOwner} placeholder="EAAAlBL..." />
            </Field>
            <Field label="Location ID" disabled={!isOwner}>
              <input className="input" value={payForm.squareLocationId} onChange={(e) => setPayForm((f) => ({ ...f, squareLocationId: e.target.value }))} disabled={!isOwner} placeholder="LID..." />
            </Field>
          </div>

          {/* PayPal */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">PayPal</h3>
              {payConfig?.paypalConfigured && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected</span>}
            </div>
            <Field label="Client ID" disabled={!isOwner}>
              <input className="input" value={payForm.paypalClientId} onChange={(e) => setPayForm((f) => ({ ...f, paypalClientId: e.target.value }))} disabled={!isOwner} placeholder="AYSq3RDGsmBLJE..." />
            </Field>
            <Field label="Client Secret" disabled={!isOwner}>
              <input type="password" className="input" value={payForm.paypalClientSecret} onChange={(e) => setPayForm((f) => ({ ...f, paypalClientSecret: e.target.value }))} disabled={!isOwner} placeholder="EGnHDxD_qRPdaLdZz8iehuf..." />
            </Field>
          </div>

          {isOwner && (
            <div className="flex justify-end">
              <button onClick={handleSavePayConfig} disabled={paySaving} className="btn-primary min-w-[140px]">
                {paySaving ? 'Saving…' : 'Save Payment Settings'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save button at bottom */}
      {isOwner && activeTab < 7 && (
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[140px]">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Field({ label, hint, children, disabled }: { label: string; hint?: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-brand-600' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
