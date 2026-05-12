import { prisma } from '../../../shared/db/prismaClient';

const CUSTOMER_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { appointments: true } },
} as const;

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { appointments: number };
};

export async function findAllCustomers(tenantId: string, search?: string): Promise<CustomerRow[]> {
  return prisma.customer.findMany({
    where: {
      tenantId,
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: CUSTOMER_SELECT,
    orderBy: { name: 'asc' },
    take: 200,
  });
}

export async function findCustomerById(tenantId: string, id: string) {
  return prisma.customer.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      appointments: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          service: { select: { id: true, name: true } },
          staff:   { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'desc' },
        take: 20,
      },
    },
  });
}
