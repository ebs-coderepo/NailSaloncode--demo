import type { Metadata } from 'next';
import Link from 'next/link';
import BookingFlow from './BookingFlow';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const SLUG    = process.env.NEXT_PUBLIC_SALON_SLUG ?? 'luxe-nails';

async function fetchSalonInfo() {
  try {
    const res = await fetch(`${API_URL}/v1/public/${SLUG}`, { cache: 'no-store' });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: 'Book an Appointment' };

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r} ${g} ${b}`;
}

export default async function BookPage() {
  const data = await fetchSalonInfo();

  if (!data || !data.salon.siteEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-5xl mb-6">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">We&apos;ll Be Back Soon</h1>
          <p className="text-gray-500 mb-6">Our website is temporarily offline for maintenance.</p>
          <Link href="/" className="text-pink-600 font-medium hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  if (!data.salon.bookingEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Online Booking Unavailable</h1>
          <p className="text-gray-500 mb-6">Please call us to book your appointment.</p>
          <Link href="/" className="text-pink-600 font-medium hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  const { salon, services, staff } = data;
  const primary = salon.primaryColor ?? '#db2777';
  const isDark  = salon.theme === 'dark';
  const rgb = hexToRgb(primary);

  const cssVars = `
    :root { --primary: ${primary}; --primary-rgb: ${rgb}; }
    .pub-btn-primary { background-color: var(--primary); color: white; }
    .pub-btn-primary:hover { filter: brightness(0.9); }
    .pub-step-active { border-color: var(--primary) !important; color: var(--primary) !important; }
    .pub-step-done { background-color: var(--primary) !important; border-color: var(--primary) !important; color: white !important; }
    .pub-card-selected { border-color: var(--primary) !important; background-color: rgba(${rgb} / 0.06) !important; }
    .pub-slot-available:hover { border-color: var(--primary); color: var(--primary); }
    .pub-slot-selected { background-color: var(--primary) !important; border-color: var(--primary) !important; color: white !important; }
    .pub-accent { color: var(--primary); }
  `.trim();

  return (
    <div className={isDark ? 'dark' : ''}>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <header className={`sticky top-0 z-40 backdrop-blur border-b shadow-sm ${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-100'}`}>
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className={`text-sm font-medium ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              ← {salon.name}
            </Link>
            <span className="font-semibold text-lg">Book an Appointment</span>
            <div className="w-24" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-10">
          <BookingFlow services={services} staff={staff} salon={salon} slug={SLUG} isDark={isDark} />
        </main>
      </div>
    </div>
  );
}
