import { prisma } from '../../../shared/db/prismaClient';

// ─────────────────────────────────────────────────────────────────────────────
// Services Repository
//
// Responsibility: raw data access for the services table.
// No business logic here — only SQL/Prisma queries.
// All queries are explicitly scoped to tenantId — this is the tenancy fence.
// ─────────────────────────────────────────────────────────────────────────────

// Shape returned from the DB — intentionally minimal.
// We select only what the service layer (and ultimately the voice AI) needs.
export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: string; // Decimal serialised as string to avoid float precision loss
};

export async function findActiveServicesByTenant(
  tenantId: string,
): Promise<ServiceRow[]> {
  const rows = await prisma.service.findMany({
    where: {
      tenantId,        // tenant fence — NEVER omit this
      isActive: true,  // voice AI only books active services
    },
    select: {
      id: true,
      name: true,
      description: true,
      duration: true,
      price: true,
    },
    orderBy: { name: 'asc' }, // stable ordering for voice AI list reads
  });

  // Prisma returns Decimal as a Decimal.js object; convert to plain string here
  // so the layer above works with standard JS types only.
  return rows.map((row) => ({
    ...row,
    price: row.price.toString(),
  }));
}
