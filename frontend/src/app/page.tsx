import type { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const SLUG    = process.env.NEXT_PUBLIC_SALON_SLUG ?? 'luxe-nails';

async function fetchSalonInfo() {
  const url = `${API_URL}/v1/public/${SLUG}`;
  try {
    console.log('[fetchSalonInfo] fetching:', url);
    const res = await fetch(url, { cache: 'no-store' });
    console.log('[fetchSalonInfo] status:', res.status);
    const json = await res.json();
    console.log('[fetchSalonInfo] success:', json.success);
    return json.success ? json.data : null;
  } catch (err) {
    console.error('[fetchSalonInfo] error:', err);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchSalonInfo();
  return {
    title: data?.salon?.name ?? 'Book an Appointment',
    description: data?.salon?.tagline ?? 'Book your nail appointment online.',
  };
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function formatHour(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${m.toString().padStart(2,'0')} ${period}`;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r} ${g} ${b}`;
}

export default async function PublicHomePage() {
  const data = await fetchSalonInfo();

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Salon not found</h1>
          <p className="text-gray-500">Please check back later.</p>
        </div>
      </div>
    );
  }

  if (!data.salon.siteEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-5xl mb-6">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">We&apos;ll Be Back Soon</h1>
          <p className="text-gray-500 mb-4">Our website is temporarily offline for maintenance. Please check back later or call us directly.</p>
          {data.salon.phone && (
            <a href={`tel:${data.salon.phone}`} className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors">
              Call {data.salon.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  const { salon, services, staff, reviews } = data;
  const primary = salon.primaryColor ?? '#db2777';
  const isDark  = salon.theme === 'dark';
  const rgb = hexToRgb(primary);

  const cssVars = `
    :root { --primary: ${primary}; --primary-rgb: ${rgb}; }
    .pub-btn-primary { background-color: var(--primary); color: white; }
    .pub-btn-primary:hover { filter: brightness(0.9); }
    .pub-btn-outline { border: 2px solid var(--primary); color: var(--primary); }
    .pub-btn-outline:hover { background-color: var(--primary); color: white; }
    .pub-accent { color: var(--primary); }
    .pub-accent-bg { background-color: rgba(${rgb} / 0.08); }
    .pub-card-hover:hover { border-color: var(--primary); }
    .pub-hero-overlay { background: linear-gradient(to bottom,rgba(0,0,0,0.45),rgba(0,0,0,0.65)); }
  `.trim();

  return (
    <div className={isDark ? 'dark' : ''}>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>

        {/* Nav */}
        <nav className={`sticky top-0 z-50 backdrop-blur border-b shadow-sm ${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-100'}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {salon.logoUrl && <img src={salon.logoUrl} alt={salon.name} className="h-8 w-8 rounded-full object-cover" />}
              <span className="font-bold text-lg">{salon.name}</span>
            </div>
            <div className="flex items-center gap-5">
              {(['#services','#team','#hours','#contact'] as const).map((href, i) => {
                const labels = ['Services','Team','Hours','Contact'];
                if (href === '#team' && (staff as any[]).length === 0) return null;
                return (
                  <a key={href} href={href} className={`text-sm font-medium hidden sm:block ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    {labels[i]}
                  </a>
                );
              })}
              {salon.bookingEnabled && (
                <Link href="/book" className="pub-btn-primary px-4 py-2 rounded-lg text-sm font-semibold transition-all">Book Now</Link>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section
          className="relative min-h-[560px] flex items-center justify-center overflow-hidden"
          style={salon.coverImageUrl ? { backgroundImage:`url(${salon.coverImageUrl})`, backgroundSize:'cover', backgroundPosition:'center' } : {}}
        >
          {salon.coverImageUrl
            ? <div className="pub-hero-overlay absolute inset-0" />
            : <div className="absolute inset-0 pub-accent-bg" style={{ backgroundImage:`radial-gradient(ellipse at top right, rgba(${rgb} / 0.25) 0%, transparent 60%)` }} />
          }
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <p className={`text-sm font-semibold uppercase tracking-widest mb-4 ${salon.coverImageUrl ? 'text-white/70' : 'pub-accent'}`}>Welcome to</p>
            <h1 className={`text-4xl sm:text-6xl font-bold mb-5 leading-tight ${salon.coverImageUrl ? 'text-white' : ''}`}>{salon.name}</h1>
            {salon.tagline && (
              <p className={`text-lg sm:text-xl mb-10 max-w-xl mx-auto ${salon.coverImageUrl ? 'text-white/80' : isDark ? 'text-gray-300' : 'text-gray-600'}`}>{salon.tagline}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {salon.bookingEnabled && (
                <Link href="/book" className="pub-btn-primary px-8 py-3 rounded-xl text-base font-semibold shadow-lg transition-all inline-block">
                  Book an Appointment
                </Link>
              )}
              <a href="#services" className={`pub-btn-outline px-8 py-3 rounded-xl text-base font-semibold transition-all inline-block ${salon.coverImageUrl ? 'border-white text-white hover:bg-white/10' : ''}`}>
                See Services
              </a>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Our Services</h2>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Professional nail care tailored to you</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(services as any[]).map((s) => (
                <div key={s.id} className={`pub-card-hover rounded-2xl p-6 border-2 transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg leading-snug pr-2">{s.name}</h3>
                    <span className="pub-accent font-bold text-lg whitespace-nowrap">{s.price}</span>
                  </div>
                  {s.description && <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-500'}`}>{s.durationDisplay}</span>
                    {salon.bookingEnabled && (
                      <Link href={`/book?serviceId=${s.id}`} className="pub-accent text-sm font-semibold hover:underline">Book →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Staff */}
        {(staff as any[]).length > 0 && (
          <section id="team" className={`py-20 px-4 ${isDark ? 'bg-gray-800/40' : 'bg-gray-50'}`}>
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-3">Meet Our Team</h2>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Expert technicians dedicated to your care</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(staff as any[]).map((member) => (
                  <div key={member.id} className={`rounded-2xl p-6 text-center border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold" style={{ backgroundColor: primary }}>
                      {member.name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                    {member.averageRating != null && member.ratingCount > 0 && (
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <span className="text-yellow-400">{'★'.repeat(Math.round(member.averageRating))}{'☆'.repeat(5 - Math.round(member.averageRating))}</span>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{(member.averageRating as number).toFixed(1)}</span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({member.ratingCount})</span>
                      </div>
                    )}
                    {member.experienceYears != null && (
                      <p className={`text-xs mb-1 font-medium pub-accent`}>{member.experienceYears} yr{member.experienceYears !== 1 ? 's' : ''} experience</p>
                    )}
                    {member.specialties && (
                      <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{member.specialties}</p>
                    )}
                    {member.bio && <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{member.bio}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Gallery */}
        {salon.galleryImages && (salon.galleryImages as any[]).length > 0 && (
          <section className="py-20 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-3">Our Work</h2>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>A glimpse into our craft</p>
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {(salon.galleryImages as any[]).sort((a, b) => a.order - b.order).map((img: any, i: number) => (
                  <div key={i} className="group relative overflow-hidden rounded-2xl aspect-square bg-gray-100">
                    <img
                      src={img.url}
                      alt={img.caption || `Gallery ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {img.caption && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                        <p className="text-white text-sm font-medium p-3 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">{img.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Reviews */}
        {salon.reviewsEnabled && (reviews as any[]).length > 0 && (
          <section className={`py-20 px-4 ${isDark ? 'bg-gray-800/40' : 'bg-gray-50'}`}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-3">What Our Clients Say</h2>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Real experiences from real customers</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(reviews as any[]).slice(0, 9).map((review: any) => (
                  <div key={review.id} className={`rounded-2xl p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                    {salon.reviewsShowRating && (
                      <div className="flex items-center gap-1 mb-3">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className={`text-lg ${s <= review.rating ? 'text-yellow-400' : isDark ? 'text-gray-700' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    )}
                    {review.comment && (
                      <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>"{review.comment}"</p>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{review.customerName}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {review.staffName} · {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Hours */}
        {salon.businessHours && (
          <section id="hours" className="py-20 px-4">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-3">Business Hours</h2>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Walk-ins welcome during open hours</p>
              </div>
              <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                {[0,1,2,3,4,5,6].map((day) => {
                  const bh = salon.businessHours as Record<string,any>;
                  const hours = bh[String(day)];
                  const isToday = new Date().getDay() === day;
                  return (
                    <div key={day} className={`flex items-center justify-between px-5 py-3 border-b last:border-b-0 ${isDark ? 'border-gray-700' : 'border-gray-50'} ${isToday ? 'pub-accent-bg' : ''}`}>
                      <span className={`font-medium text-sm ${isToday ? 'pub-accent font-semibold' : ''}`}>{DAY_NAMES[day]}{isToday && ' · today'}</span>
                      {hours
                        ? <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatHour(hours.open)} – {formatHour(hours.close)}</span>
                        : <span className={`text-sm italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Closed</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Why us */}
        <section className={`py-20 px-4 ${isDark ? 'bg-gray-800/40' : 'bg-gray-50'}`}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose {salon.name}?</h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[['✨','Premium Products','Only high-quality, long-lasting nail products for beautiful results.'],
                ['🏆','Expert Technicians','Our team brings years of experience and passion to every appointment.'],
                ['📱','Easy Online Booking','Book in seconds — anytime, from any device, 24/7.']
              ].map(([icon, title, desc]) => (
                <div key={title} className="text-center">
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{title}</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section id="contact" className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl p-10 text-center text-white relative overflow-hidden" style={{ backgroundColor: primary }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage:'radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-3">Ready to Look Your Best?</h2>
                <p className="text-white/80 mb-8 text-lg">Book online or give us a call — we&apos;d love to see you.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {salon.bookingEnabled && (
                    <Link href="/book" className="bg-white font-semibold px-8 py-3 rounded-xl text-base transition-all hover:bg-gray-100 inline-block" style={{ color: primary }}>
                      Book Appointment
                    </Link>
                  )}
                  {salon.phone && (
                    <a href={`tel:${salon.phone}`} className="border-2 border-white text-white font-semibold px-8 py-3 rounded-xl text-base transition-all hover:bg-white/10 inline-block">
                      {salon.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className={`mt-10 grid gap-6 sm:grid-cols-3 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {salon.address && <div><p className="font-semibold mb-1" style={{ color: primary }}>Address</p><p>{salon.address}</p></div>}
              {salon.phone   && <div><p className="font-semibold mb-1" style={{ color: primary }}>Phone</p><a href={`tel:${salon.phone}`} className="hover:underline">{salon.phone}</a></div>}
              {salon.email   && <div><p className="font-semibold mb-1" style={{ color: primary }}>Email</p><a href={`mailto:${salon.email}`} className="hover:underline">{salon.email}</a></div>}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`border-t py-10 px-4 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold">{salon.name}</p>
              {salon.tagline && <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{salon.tagline}</p>}
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {salon.socialInstagram && <a href={salon.socialInstagram} target="_blank" rel="noopener noreferrer" className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Instagram</a>}
              {salon.socialFacebook  && <a href={salon.socialFacebook}  target="_blank" rel="noopener noreferrer" className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Facebook</a>}
              {salon.socialWebsite   && <a href={salon.socialWebsite}   target="_blank" rel="noopener noreferrer" className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Website</a>}
              <Link href="/login" className={`text-xs ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}>Staff Login</Link>
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>Powered by AI Voice Receptionist</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
