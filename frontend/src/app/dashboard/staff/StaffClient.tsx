'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api.client';

type Service = { id: string; name: string; isActive: boolean };

type StaffMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  experienceYears: number | null;
  specialties: string | null;
  averageRating: number | null;
  ratingCount: number;
  isActive: boolean;
  services: Service[];
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialStaff: StaffMember[];
  myProfile: StaffMember | null;
  allServices: Service[];
  role: string;
};

const EMPTY_FORM = { name: '', email: '', phone: '', bio: '', experienceYears: '', specialties: '', serviceIds: [] as string[] };

export default function StaffClient({ initialStaff, myProfile, allServices, role }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [profile, setProfile] = useState<StaffMember | null>(myProfile);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: myProfile?.name ?? '',
    phone: myProfile?.phone ?? '',
    bio: myProfile?.bio ?? '',
  });

  const canMutate = role === 'OWNER' || role === 'MANAGER';

  // ── Staff list (OWNER/MANAGER) ─────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModal('add');
    setError('');
  }

  function openEdit(member: StaffMember) {
    setForm({
      name: member.name,
      email: member.email ?? '',
      phone: member.phone ?? '',
      bio: member.bio ?? '',
      experienceYears: member.experienceYears != null ? String(member.experienceYears) : '',
      specialties: member.specialties ?? '',
      serviceIds: member.services.map((s) => s.id),
    });
    setEditTarget(member);
    setModal('edit');
    setError('');
  }

  function closeModal() { setModal(null); setEditTarget(null); setError(''); }

  function toggleService(id: string) {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((s) => s !== id)
        : [...prev.serviceIds, id],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        name:            form.name.trim(),
        email:           form.email.trim() || null,
        phone:           form.phone.trim() || null,
        bio:             form.bio.trim()   || null,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : null,
        specialties:     form.specialties.trim() || null,
        serviceIds:      form.serviceIds,
      };
      if (modal === 'add') {
        const res = await apiFetch<StaffMember>('/api/v1/admin/staff', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!res.success) { setError(res.message); return; }
        setStaff((prev) => [...prev, res.data]);
      } else if (modal === 'edit' && editTarget) {
        const res = await apiFetch<StaffMember>(`/api/v1/admin/staff/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        if (!res.success) { setError(res.message); return; }
        setStaff((prev) => prev.map((s) => s.id === editTarget.id ? res.data : s));
      }
      closeModal();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setSaving(false); }
  }

  async function handleToggleActive(member: StaffMember) {
    try {
      const res = await apiFetch<StaffMember>(`/api/v1/admin/staff/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      if (res.success) setStaff((prev) => prev.map((s) => s.id === member.id ? res.data : s));
    } catch { /* silent */ }
  }

  // ── My Profile (STAFF) ────────────────────────────────────────────────────

  async function handleProfileSave() {
    if (!profileForm.name.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await apiFetch<StaffMember>('/api/v1/admin/staff/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name:  profileForm.name.trim(),
          phone: profileForm.phone.trim() || null,
          bio:   profileForm.bio.trim()   || null,
        }),
      });
      if (res.success) {
        setProfile(res.data);
        setProfileEditing(false);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Something went wrong.');
    } finally { setSaving(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (role === 'STAFF') {
    return <MyProfileView
      profile={profile}
      profileEditing={profileEditing}
      profileForm={profileForm}
      setProfileForm={setProfileForm}
      setProfileEditing={setProfileEditing}
      handleProfileSave={handleProfileSave}
      saving={saving}
      error={error}
    />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 mt-1">Manage your technicians and their service assignments.</p>
        </div>
        {canMutate && (
          <button onClick={openAdd} className="btn-primary">
            + Add Staff
          </button>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          No staff members yet.{canMutate && ' Click "Add Staff" to get started.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              canMutate={canMutate}
              onEdit={openEdit}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {modal && (
        <StaffModal
          mode={modal}
          form={form}
          setForm={setForm}
          allServices={allServices}
          toggleService={toggleService}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StaffCard({
  member,
  canMutate,
  onEdit,
  onToggleActive,
}: {
  member: StaffMember;
  canMutate: boolean;
  onEdit: (m: StaffMember) => void;
  onToggleActive: (m: StaffMember) => void;
}) {
  return (
    <div className={`card p-5 flex flex-col gap-3 ${!member.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{member.name}</p>
          {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
          {member.phone && <p className="text-xs text-gray-500">{member.phone}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {member.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {member.bio && <p className="text-sm text-gray-600">{member.bio}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {member.averageRating != null && member.ratingCount > 0 && (
          <span className="text-xs text-yellow-600 font-medium">★ {member.averageRating.toFixed(1)} ({member.ratingCount})</span>
        )}
        {member.experienceYears != null && (
          <span className="text-xs text-gray-500">{member.experienceYears} yr{member.experienceYears !== 1 ? 's' : ''} exp.</span>
        )}
        {member.specialties && (
          <span className="text-xs text-gray-500 truncate">{member.specialties}</span>
        )}
      </div>

      {member.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.services.map((s) => (
            <span key={s.id} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
              {s.name}
            </span>
          ))}
        </div>
      )}

      {canMutate && (
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={() => onEdit(member)}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onToggleActive(member)}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            {member.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      )}
    </div>
  );
}

function StaffModal({
  mode,
  form,
  setForm,
  allServices,
  toggleService,
  onSave,
  onClose,
  saving,
  error,
}: {
  mode: 'add' | 'edit';
  form: { name: string; email: string; phone: string; bio: string; experienceYears: string; specialties: string; serviceIds: string[] };
  setForm: (f: any) => void;
  allServices: Service[];
  toggleService: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="input w-full"
              value={form.name}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, name: e.target.value }))}
              placeholder="Jessica Lee"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              className="input w-full"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, email: e.target.value }))}
              placeholder="jessica@luxenails.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              className="input w-full"
              value={form.phone}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, phone: e.target.value }))}
              placeholder="+1 212 555 0100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              className="input w-full"
              rows={2}
              value={form.bio}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, bio: e.target.value }))}
              placeholder="Specialist in gel manicures..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                className="input w-full"
                type="number"
                min={0}
                max={50}
                value={form.experienceYears}
                onChange={(e) => setForm((f: typeof form) => ({ ...f, experienceYears: e.target.value }))}
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
              <input
                className="input w-full"
                value={form.specialties}
                onChange={(e) => setForm((f: typeof form) => ({ ...f, specialties: e.target.value }))}
                placeholder="Gel Nails, Nail Art"
              />
            </div>
          </div>

          {allServices.filter((s) => s.isActive).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
              <div className="grid grid-cols-2 gap-2">
                {allServices.filter((s) => s.isActive).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="rounded border-gray-300 text-brand-600"
                    />
                    <span className="text-sm text-gray-700">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={onSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : mode === 'add' ? 'Add Staff' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MyProfileView({
  profile,
  profileEditing,
  profileForm,
  setProfileForm,
  setProfileEditing,
  handleProfileSave,
  saving,
  error,
}: {
  profile: StaffMember | null;
  profileEditing: boolean;
  profileForm: { name: string; phone: string; bio: string };
  setProfileForm: (f: any) => void;
  setProfileEditing: (v: boolean) => void;
  handleProfileSave: () => void;
  saving: boolean;
  error: string;
}) {
  if (!profile) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
        <div className="card p-8 text-center text-gray-500">
          No staff profile is linked to your account. Contact your manager.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Your personal information and assigned services.</p>
        </div>
        {!profileEditing && (
          <button
            onClick={() => setProfileEditing(true)}
            className="btn-secondary"
          >
            Edit
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-4">{error}</p>}

      <div className="card p-6 space-y-5">
        {profileEditing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                className="input w-full"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f: typeof profileForm) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="input w-full"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f: typeof profileForm) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                className="input w-full"
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setProfileForm((f: typeof profileForm) => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleProfileSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setProfileEditing(false)} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <ProfileRow label="Name"  value={profile.name} />
            <ProfileRow label="Email" value={profile.email ?? '—'} />
            <ProfileRow label="Phone" value={profile.phone ?? '—'} />
            <ProfileRow label="Bio"   value={profile.bio   ?? '—'} />
          </>
        )}

        {profile.services.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Assigned Services</p>
            <div className="flex flex-wrap gap-2">
              {profile.services.map((s) => (
                <span key={s.id} className="text-sm bg-brand-50 text-brand-700 px-3 py-1 rounded-full">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
