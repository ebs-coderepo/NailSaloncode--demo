import { z } from 'zod';
import { findAllCustomers, findCustomerById, CustomerRow } from './customers.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

export const ListCustomersSchema = z.object({
  search: z.string().optional(),
});

export type CustomerDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  appointmentCount: number;
  createdAt: string;
};

function toDto(row: CustomerRow): CustomerDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    appointmentCount: row._count.appointments,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCustomers(tenantId: string, search?: string) {
  const rows = await findAllCustomers(tenantId, search);
  return { customers: rows.map(toDto), count: rows.length };
}

export async function getCustomer(tenantId: string, id: string) {
  const row = await findCustomerById(tenantId, id);
  if (!row) throw new AppError('Customer not found', 404, ErrorCode.NOT_FOUND);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    appointments: row.appointments.map((a) => ({
      id: a.id,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
      status: a.status,
      service: a.service,
      staff: a.staff,
    })),
  };
}
