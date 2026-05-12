'use client';

import { useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api.client';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  appointmentCount: number;
  createdAt: string;
};

type AppointmentHistory = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { id: string; name: string };
  staff: { id: string; name: string };
};

type CustomerDetail = Customer & { appointments: AppointmentHistory[] };

type Props = {
  initialCustomers: Customer[];
  role: string;
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  COMPLETED: 'bg-blue-50 text-blue-700',
  PENDING:   'bg-yellow-50 text-yellow-700',
  NO_SHOW:   'bg-gray-100 text-gray-500',
};

export default function CustomersClient({ initialCustomers }: Props) {
  const [customers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q),
    );
  }, [customers, search]);

  async function openDetail(customer: Customer) {
    setLoadingDetail(true);
    try {
      const res = await apiFetch<CustomerDetail>(`/api/v1/admin/customers/${customer.id}`);
      if (res.success) setDetailCustomer(res.data);
    } catch { /* silent */ }
    finally { setLoadingDetail(false); }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Customer profiles created automatically by the voice AI.</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          className="input flex-1 max-w-sm text-sm"
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-gray-500 self-center">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          {customers.length === 0 ? 'No customers yet. They are created automatically when the voice AI identifies a caller.' : 'No customers match your search.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Appointments</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Since</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-4 py-3 text-gray-700">{customer.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{customer.appointmentCount}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(customer.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openDetail(customer)}
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      disabled={loadingDetail}
                    >
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{detailCustomer.name}</h2>
                <p className="text-sm text-gray-500">{detailCustomer.phone}{detailCustomer.email && ` · ${detailCustomer.email}`}</p>
              </div>
              <button onClick={() => setDetailCustomer(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {detailCustomer.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-sm text-amber-800">
                <strong>Notes:</strong> {detailCustomer.notes}
              </div>
            )}

            <h3 className="text-sm font-semibold text-gray-700 mb-3">Appointment History</h3>
            {detailCustomer.appointments.length === 0 ? (
              <p className="text-sm text-gray-500">No appointments yet.</p>
            ) : (
              <div className="space-y-2">
                {detailCustomer.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.service.name}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(a.startTime)} · {a.staff.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
