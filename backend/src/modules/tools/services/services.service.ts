import { findActiveServicesByTenant } from './services.repository';

// ─────────────────────────────────────────────────────────────────────────────
// Services Service (domain / business logic layer)
//
// Sits between the controller and the repository.
// This is where we would apply business rules — e.g. filtering services by
// staff capability, injecting duration display labels, etc.
//
// Keeping this layer even when logic is simple today gives us a clean place
// to grow without touching routes or controllers.
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceDto = {
  id: string;
  name: string;
  description: string | null;
  duration: number;           // raw minutes — used for availability math
  durationDisplay: string;    // human-readable: "60 min" — for voice AI speech
  price: string;              // "$45.00" — formatted for voice AI to read aloud
  priceRaw: string;           // "45.00" — for any numeric downstream processing
};

export type GetServicesResult = {
  services: ServiceDto[];
  count: number;
};

export async function getActiveServices(
  tenantId: string,
): Promise<GetServicesResult> {
  const rows = await findActiveServicesByTenant(tenantId);

  const services: ServiceDto[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.duration,
    // Pre-format for the voice AI so it never has to do math or formatting
    durationDisplay: formatDuration(row.duration),
    price: formatPrice(row.price),
    priceRaw: row.price,
  }));

  return { services, count: services.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers (pure functions — easy to test in isolation)
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatPrice(priceStr: string): string {
  const num = parseFloat(priceStr);
  // USD formatting — extend with tenant locale/currency when needed
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}
