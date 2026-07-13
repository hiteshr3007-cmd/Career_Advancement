"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shield, UserPlus } from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractApiError } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import adminService from "@/services/admin.service";
import { useAuth } from "@/store/auth-context";
import { AdminUser, ASSIGNABLE_ROLES, AssignableRole } from "@/types/admin";

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

export default function AdminPage() {
  const { user } = useAuth();

  if (!isAdmin(user?.role)) {
    return (
      <AccessRestricted message="User administration is only available to administrators." />
    );
  }

  return <AdminUsersView />;
}

function AdminUsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.listUsers();
      setUsers(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(extractApiError(err, "Couldn't load users. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const upsertUser = (updated: AdminUser) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === updated.id);
      return exists
        ? prev.map((u) => (u.id === updated.id ? updated : u))
        : [updated, ...prev];
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Administration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add recruiters, HR reviewers, and employers, and manage existing accounts.
        </p>
      </div>

      <CreateUserForm onCreated={upsertUser} />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 p-4">
          <Shield size={18} className="text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">All users</h2>
        </div>

        {loadError && (
          <p className="m-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {loadError}
          </p>
        )}

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} onUpdated={upsertUser} />
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

// ---- Create user ------------------------------------------------------------

function CreateUserForm({ onCreated }: { onCreated: (user: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AssignableRole>("recruiter");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await adminService.createUser({
        email,
        password,
        full_name: fullName,
        role,
      });
      onCreated(created);
      setSuccess(`${created.full_name} was added as ${roleLabel(created.role)}.`);
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("recruiter");
    } catch (err) {
      setError(extractApiError(err, "Couldn't create that user. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <UserPlus size={18} className="text-indigo-600" />
        Add a recruiter, HR reviewer, or employer
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Role</label>
          <select
            className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            value={role}
            onChange={(e) => setRole(e.target.value as AssignableRole)}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}
      {success && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="mt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add user"}
        </Button>
      </div>
    </form>
  );
}

// ---- Existing user row --------------------------------------------------

function UserRow({
  user,
  onUpdated,
}: {
  user: AdminUser;
  onUpdated: (user: AdminUser) => void;
}) {
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canChangeRole = ASSIGNABLE_ROLES.includes(user.role as AssignableRole);

  const handleRoleChange = async (newRole: AssignableRole) => {
    if (newRole === user.role) return;
    setIsSavingRole(true);
    setError(null);
    try {
      const updated = await adminService.updateUserRole(user.id, { role: newRole });
      onUpdated(updated);
    } catch (err) {
      setError(extractApiError(err, "Couldn't update role."));
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    setError(null);
    try {
      const updated = user.is_active
        ? await adminService.deactivateUser(user.id)
        : await adminService.activateUser(user.id);
      onUpdated(updated);
    } catch (err) {
      setError(extractApiError(err, "Couldn't update status."));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium text-slate-900">{user.full_name}</TableCell>
      <TableCell className="text-slate-500">{user.email}</TableCell>
      <TableCell>
        {canChangeRole ? (
          <select
            className="h-8 rounded-3xl border border-transparent bg-input/50 px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            value={user.role}
            disabled={isSavingRole}
            onChange={(e) => handleRoleChange(e.target.value as AssignableRole)}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant="outline">{roleLabel(user.role)}</Badge>
        )}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </TableCell>
      <TableCell>
        <Badge variant={user.is_active ? "secondary" : "destructive"}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isTogglingStatus}
          onClick={handleToggleStatus}
        >
          {user.is_active ? "Deactivate" : "Activate"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
