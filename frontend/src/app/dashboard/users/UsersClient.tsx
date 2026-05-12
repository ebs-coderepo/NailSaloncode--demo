'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api.client';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type Props = { initialUsers: User[]; currentUserId: string };

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF:   'bg-gray-100 text-gray-700',
};

export default function UsersClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers]           = useState<User[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [resetUser, setResetUser]   = useState<User | null>(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // Change own password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpForm, setCpForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [cpError, setCpError] = useState('');
  const [cpSaving, setCpSaving] = useState(false);

  async function reloadUsers() {
    const res = await apiFetch<{ users: User[] }>('/api/v1/admin/users');
    if (res.success) setUsers(res.data.users);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (cpForm.newPassword !== cpForm.confirmPassword) {
      setCpError('Passwords do not match.');
      return;
    }
    setCpSaving(true); setCpError('');
    const res = await apiFetch('/api/v1/admin/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: cpForm.currentPassword, newPassword: cpForm.newPassword }),
    });
    setCpSaving(false);
    if (res.success) {
      setShowChangePassword(false);
      setCpForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setCpError(res.message);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Accounts</h1>
          <p className="text-gray-500 mt-1">Manage login accounts for your team members.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChangePassword(true)} className="btn-secondary">
            Change My Password
          </button>
          <button onClick={() => { setShowCreate(true); setError(''); }} className="btn-primary">
            + Add Account
          </button>
        </div>
      </div>

      {error   && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-4">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg mb-4">{success}</p>}

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Last Login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.name}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-brand-600 font-normal">(you)</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {u.id !== currentUserId && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditUser(u); setError(''); }} className="text-xs text-brand-600 hover:underline">Edit</button>
                      <button onClick={() => { setResetUser(u); setError(''); }} className="text-xs text-orange-500 hover:underline">Reset Password</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">No team accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await reloadUsers(); setSuccess('Account created successfully.'); setTimeout(() => setSuccess(''), 4000); }}
        />
      )}

      {/* Edit modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={async () => { setEditUser(null); await reloadUsers(); setSuccess('Account updated.'); setTimeout(() => setSuccess(''), 4000); }}
        />
      )}

      {/* Reset password modal */}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onReset={() => { setResetUser(null); setSuccess('Password reset successfully.'); setTimeout(() => setSuccess(''), 4000); }}
        />
      )}

      {/* Change own password modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Your Password</h2>
            {cpError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{cpError}</p>}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" className="input w-full" value={cpForm.currentPassword} onChange={(e) => setCpForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" className="input w-full" value={cpForm.newPassword} onChange={(e) => setCpForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" className="input w-full" value={cpForm.confirmPassword} onChange={(e) => setCpForm((f) => ({ ...f, confirmPassword: e.target.value }))} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowChangePassword(false); setCpForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setCpError(''); }} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={cpSaving} className="flex-1 btn-primary">{cpSaving ? 'Saving…' : 'Change Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiFetch('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.success) { onCreated(); }
    else { setError(res.message); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Team Account</h2>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input w-full" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required placeholder="jane@yoursalon.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
            <input type="password" className="input w-full" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} placeholder="Min. 8 characters" />
            <p className="text-xs text-gray-400 mt-1">Share this with the employee — they can change it after login.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select className="input w-full" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="STAFF">Staff — Read-only + own schedule</option>
              <option value="MANAGER">Manager — Manage schedule, staff, services</option>
              <option value="OWNER">Owner — Full access</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Creating…' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: user.name, role: user.role, isActive: user.isActive });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiFetch(`/api/v1/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.success) { onSaved(); }
    else { setError(res.message); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Edit Account</h2>
        <p className="text-sm text-gray-500 mb-4">{user.email}</p>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select className="input w-full" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}>
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm text-gray-900">Account Active</p>
              <p className="text-xs text-gray-500">Inactive accounts cannot log in.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-brand-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset password modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose, onReset }: { user: User; onClose: () => void; onReset: () => void }) {
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setSaving(true); setError('');
    const res = await apiFetch(`/api/v1/admin/users/${user.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: form.newPassword }),
    });
    setSaving(false);
    if (res.success) { onReset(); }
    else { setError(res.message); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-4">Setting a new password for <strong>{user.name}</strong> ({user.email}). Share the new password with them securely.</p>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" className="input w-full" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={8} placeholder="Min. 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" className="input w-full" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Resetting…' : 'Reset Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
