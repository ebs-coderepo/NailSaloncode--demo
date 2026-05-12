'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import {
  ServiceDto,
  ServiceFormValues,
  apiCreateService,
  apiUpdateService,
  apiDeleteService,
} from '@/lib/services.api';

// ─────────────────────────────────────────────────────────────────────────────
// Main client component — receives initial services from the Server Component.
// All mutations update local state immediately (optimistic) then sync to backend.
// ─────────────────────────────────────────────────────────────────────────────

export default function ServicesClient({
  initialServices,
  role,
}: {
  initialServices: ServiceDto[];
  role: string;
}) {
  const canMutate = role === 'OWNER' || role === 'MANAGER';
  const [services, setServices] = useState<ServiceDto[]>(initialServices);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(service: ServiceDto) {
    setEditing(service);
    setFormOpen(true);
  }

  async function handleSave(values: ServiceFormValues) {
    setError(null);
    try {
      if (editing) {
        const updated = await apiUpdateService(editing.id, values);
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await apiCreateService(values);
        setServices((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function handleToggleActive(service: ServiceDto) {
    setError(null);
    try {
      const updated = await apiUpdateService(service.id, { isActive: !service.isActive });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function handleDelete(service: ServiceDto) {
    setError(null);
    try {
      await apiDeleteService(service.id);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleteTarget(null);
    }
  }

  const active   = services.filter((s) => s.isActive);
  const inactive = services.filter((s) => !s.isActive);

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 mt-1">
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        {canMutate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Add Service
          </button>
        )}
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 card p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">⚠ {error}</p>
        </div>
      )}

      {/* ── Active services ──────────────────────────────────────────────────── */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Active
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                canMutate={canMutate}
                onEdit={openEdit}
                onToggle={handleToggleActive}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Inactive services ────────────────────────────────────────────────── */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Inactive
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactive.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                canMutate={canMutate}
                onEdit={openEdit}
                onToggle={handleToggleActive}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {services.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-3xl mb-3">💅</p>
          <h3 className="font-semibold text-gray-900">No services yet</h3>
          <p className="text-sm text-gray-500 mt-1">Add your first service to get started.</p>
          {canMutate && (
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            + Add Service
          </button>
        )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {formOpen && (
        <ServiceFormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          service={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Service card
// ─────────────────────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  canMutate,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: ServiceDto;
  canMutate: boolean;
  onEdit: (s: ServiceDto) => void;
  onToggle: (s: ServiceDto) => void;
  onDelete: (s: ServiceDto) => void;
}) {
  return (
    <div className={`card p-5 transition-all ${!service.isActive ? 'opacity-60' : 'hover:shadow-md'}`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">💅</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${service.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {service.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Info */}
      <h3 className="font-semibold text-gray-900">{service.name}</h3>
      {service.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
      )}

      {/* Price + duration */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">{service.durationDisplay}</span>
        <span className="text-sm font-semibold text-brand-700">{service.price}</span>
      </div>

      {/* Action buttons — hidden for STAFF (view-only) */}
      {canMutate && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => onEdit(service)}
            className="flex-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-1.5 rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onToggle(service)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              service.isActive
                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
            }`}
          >
            {service.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(service)}
            className="flex-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 py-1.5 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Service form modal — used for both create and edit
// ─────────────────────────────────────────────────────────────────────────────

function ServiceFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ServiceDto | null;
  onSave: (values: ServiceFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ServiceFormValues>({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    duration:    initial?.duration    ?? 60,
    price:       initial?.priceRaw    ?? 0,
  });

  // Auto-focus name on open
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    if (!form.name.trim()) { setFieldError('Name is required'); return; }
    if (form.duration < 5) { setFieldError('Duration must be at least 5 minutes'); return; }
    if (form.price < 0)    { setFieldError('Price cannot be negative'); return; }

    startTransition(async () => {
      await onSave(form);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Edit Service' : 'Add Service'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {fieldError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{fieldError}</p>
          )}

          <Field label="Service Name" required>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Gel Manicure"
              className="input"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description shown to customers…"
              rows={2}
              className="input resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)" required>
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </Field>

            <Field label="Price (USD)" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="input pl-7"
                />
              </div>
            </Field>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isPending ? 'Saving…' : initial ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete confirmation modal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  service,
  onConfirm,
  onClose,
}: {
  service: ServiceDto;
  onConfirm: (s: ServiceDto) => Promise<void>;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Delete "{service.name}"?</h3>
            <p className="text-sm text-gray-500 mt-1">
              This is permanent. If this service has upcoming appointments, deactivate it instead.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => startTransition(async () => { await onConfirm(service); })}
            disabled={isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form field wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
