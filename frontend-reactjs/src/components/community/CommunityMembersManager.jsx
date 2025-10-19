import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  FunnelIcon,
  PencilSquareIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import usePersistentCollection from '../../hooks/usePersistentCollection.js';

const ROLE_OPTIONS = ['Owner', 'Admin', 'Moderator', 'Member'];
const STATUS_OPTIONS = ['Active', 'Pending', 'Suspended'];

const defaultMembers = [
  {
    id: 'member-1',
    name: 'Amina Rowe',
    email: 'amina@edulure.com',
    role: 'Owner',
    status: 'Active',
    title: 'Community Architect',
    location: 'San Francisco, USA',
    joinedAt: '2023-11-01',
    tags: ['Leadership', 'Stage host']
  },
  {
    id: 'member-2',
    name: 'Leo Okafor',
    email: 'leo@edulure.com',
    role: 'Moderator',
    status: 'Active',
    title: 'Operator Success',
    location: 'London, UK',
    joinedAt: '2024-01-10',
    tags: ['Moderation']
  },
  {
    id: 'member-3',
    name: 'Sofia Martínez',
    email: 'sofia@edulure.com',
    role: 'Member',
    status: 'Pending',
    title: 'Revenue Strategist',
    location: 'Madrid, ES',
    joinedAt: '2024-05-05',
    tags: ['Revenue pod']
  }
];

function MemberForm({ member, onSubmit, onCancel }) {
  const [formState, setFormState] = useState(() => ({
    name: member?.name ?? '',
    email: member?.email ?? '',
    role: member?.role ?? 'Member',
    status: member?.status ?? 'Active',
    title: member?.title ?? '',
    location: member?.location ?? '',
    tags: Array.isArray(member?.tags) ? member.tags.join(', ') : ''
  }));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...formState,
      tags: formState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    };
    onSubmit?.(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Full name
          <input
            type="text"
            name="name"
            required
            value={formState.name}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Email address
          <input
            type="email"
            name="email"
            required
            value={formState.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Role
          <select
            name="role"
            value={formState.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Status
          <select
            name="status"
            value={formState.status}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Title
          <input
            type="text"
            name="title"
            value={formState.title}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Location
          <input
            type="text"
            name="location"
            value={formState.location}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Tags
          <input
            type="text"
            name="tags"
            placeholder="Leadership, Voice stage..."
            value={formState.tags}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          <CheckCircleIcon className="h-4 w-4" /> Save member
        </button>
      </div>
    </form>
  );
}

MemberForm.propTypes = {
  member: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func
};

MemberForm.defaultProps = {
  member: null,
  onSubmit: undefined,
  onCancel: undefined
};

function MemberRow({ member, onEdit, onRemove }) {
  return (
    <tr className="border-b border-slate-100 text-sm text-slate-600 transition hover:bg-primary/5">
      <td className="px-4 py-3 font-semibold text-slate-900">{member.name}</td>
      <td className="px-4 py-3 text-xs text-slate-500">{member.email}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold text-slate-600">
          <UsersIcon className="h-4 w-4" /> {member.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
            member.status === 'Active'
              ? 'bg-emerald-50 text-emerald-600'
              : member.status === 'Suspended'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-amber-50 text-amber-600'
          }`}
        >
          {member.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs">{member.title || '—'}</td>
      <td className="px-4 py-3 text-xs">{member.location || '—'}</td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {Array.isArray(member.tags) && member.tags.length
          ? member.tags.join(', ')
          : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{new Date(member.joinedAt).toLocaleDateString()}</td>
      <td className="px-4 py-3 text-right text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => onEdit(member)}
          className="mr-2 inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-1 text-slate-500 transition hover:bg-slate-200"
        >
          <PencilSquareIcon className="h-4 w-4" /> Edit
        </button>
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-rose-600 transition hover:bg-rose-100"
        >
          <TrashIcon className="h-4 w-4" /> Remove
        </button>
      </td>
    </tr>
  );
}

MemberRow.propTypes = {
  member: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default function CommunityMembersManager({ communityId, communityName, initialMembers }) {
  const storageNamespace = communityId ? `community:${communityId}` : 'community:preview';

  const seedMembers = useMemo(() => {
    if (Array.isArray(initialMembers) && initialMembers.length) {
      return initialMembers.map((member) => ({
        ...member,
        joinedAt: member.joinedAt ?? new Date().toISOString()
      }));
    }
    return defaultMembers;
  }, [initialMembers]);

  const { items: members, addItem, updateItem, removeItem, reset } = usePersistentCollection(
    `${storageNamespace}:members`,
    seedMembers
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        if (roleFilter !== 'All roles' && member.role !== roleFilter) return false;
        if (statusFilter !== 'All statuses' && member.status !== statusFilter) return false;
        if (!searchTerm) return true;
        const haystack = `${member.name} ${member.email} ${member.location}`.toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  }, [members, roleFilter, statusFilter, searchTerm]);

  const totalMembers = members.length;
  const activeMembers = members.filter((member) => member.status === 'Active').length;
  const pendingMembers = members.filter((member) => member.status === 'Pending').length;
  const admins = members.filter((member) => member.role === 'Owner' || member.role === 'Admin').length;

  const handleCreate = (payload) => {
    const now = new Date().toISOString();
    addItem({
      ...payload,
      joinedAt: now
    });
    setIsCreating(false);
  };

  const handleUpdate = (payload) => {
    if (!editingMember) return;
    updateItem(editingMember.id, {
      ...editingMember,
      ...payload
    });
    setEditingMember(null);
  };

  const handleRemove = (id) => {
    removeItem(id);
  };

  return (
    <section className="space-y-6 rounded-4xl border border-slate-200 bg-white/70 p-6 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Members</p>
          <h2 className="text-lg font-semibold text-slate-900">{communityName} · Membership operations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track invites, promote moderators, and keep rosters aligned with your operating model.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{totalMembers} members</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">{activeMembers} active</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-600">{pendingMembers} pending</span>
          <span className="rounded-full bg-slate-900/5 px-3 py-1">{admins} admins</span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setEditingMember(null);
            setIsCreating((value) => !value);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          <PlusIcon className="h-4 w-4" /> Invite member
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <FunnelIcon className="h-4 w-4" />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {['All roles', ...ROLE_OPTIONS].map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {['All statuses', ...STATUS_OPTIONS].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, or location"
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <EnvelopeIcon className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-300" />
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset to defaults
        </button>
      </div>

      {isCreating ? (
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">Send an invitation</p>
          <p className="mt-1 text-xs text-slate-500">Capture their role, location, and tags before the invite goes out.</p>
          <div className="mt-4">
            <MemberForm member={null} onSubmit={handleCreate} onCancel={() => setIsCreating(false)} />
          </div>
        </div>
      ) : null}

      {editingMember ? (
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">Update member · {editingMember.name}</p>
          <p className="mt-1 text-xs text-slate-500">Adjust their access level, tags, and metadata.</p>
          <div className="mt-4">
            <MemberForm member={editingMember} onSubmit={handleUpdate} onCancel={() => setEditingMember(null)} />
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                  No members found. Adjust filters or invite someone new.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onEdit={(item) => {
                    setIsCreating(false);
                    setEditingMember(item);
                  }}
                  onRemove={handleRemove}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <p className="flex items-center gap-2">
          <TagIcon className="h-4 w-4" /> Tag members with operating pods to keep alignment visible.
        </p>
        <p>Data persists locally so you can rehearse workflows safely.</p>
      </footer>
    </section>
  );
}

CommunityMembersManager.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  communityName: PropTypes.string,
  initialMembers: PropTypes.array
};

CommunityMembersManager.defaultProps = {
  communityId: 'preview',
  communityName: 'Community',
  initialMembers: undefined
};
