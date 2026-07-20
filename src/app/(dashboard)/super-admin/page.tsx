"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";

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
import { isSuperAdmin } from "@/lib/roles";
import superAdminService from "@/services/superadmin.service";
import { useAuth } from "@/store/auth-context";
import { AdminAccount, ADMIN_TIER_ROLES, AdminTierRole } from "@/types/superadmin";

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

export default function SuperAdminPage() {
  const { user } = useAuth();

  if (!isSuperAdmin(user?.role)) {
    return (
      <AccessRestricted message="Admin management is only available to super admins." />
    );
  }

  return <ManageAdminsView currentUserId={user?.id} />;
}

function ManageAdminsView({ currentUserId }: { currentUserId?: string }) {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const data = await superAdminService.listAdmins();
      setAdmins(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(extractApiError(err, "Couldn't load admin accounts. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const upsertAdmin = (updated: AdminAccount) => {
    setAdmins((prev) => {
      const exists = prev.some((u) => u.id === updated.id);
      return exists
        ? prev.map((u) => (u.id === updated.id ? updated : u))
        : [updated, ...prev];
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Super Administration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage administrator and super-admin accounts. This is the only
          place admin accounts can be created or changed.
        </p>
      </div>

      <CreateAdminForm onCreated={upsertAdmin} />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 p-4">
          <ShieldCheck size={18} className="text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">Admin accounts</h2>
        </div>

        {loadError && (
          <p className="m-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {loadError}
          </p>
        )}

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading admins...</p>
        ) : admins.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No admin accounts found.</p>
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
              {admins.map((u) => (
                <AdminRow
                  key={u.id}
                  admin={u}
                  isSelf={u.id === currentUserId}
                  onUpdated={upsertAdmin}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

// ---- Create admin -----------------------------------------------------------

function CreateAdminForm({ onCreated }: { onCreated: (admin: AdminAccount) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AdminTierRole>("administrator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await superAdminService.createAdmin({
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
      setRole("administrator");
    } catch (err) {
      setError(extractApiError(err, "Couldn't create that admin. Please try again."));
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
        Add an administrator or super admin
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
            onChange={(e) => setRole(e.target.value as AdminTierRole)}
          >
            {ADMIN_TIER_ROLES.map((r) => (
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
          {isSubmitting ? "Adding..." : "Add admin"}
        </Button>
      </div>
    </form>
  );
}

// ---- Existing admin row -----------------------------------------------------

function AdminRow({
  admin,
  isSelf,
  onUpdated,
}: {
  admin: AdminAccount;
  isSelf: boolean;
  onUpdated: (admin: AdminAccount) => void;
}) {
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (newRole: AdminTierRole) => {
    if (newRole === admin.role) return;
    setIsSavingRole(true);
    setError(null);
    try {
      const updated = await superAdminService.updateAdminRole(admin.id, { role: newRole });
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
      const updated = admin.is_active
        ? await superAdminService.deactivateAdmin(admin.id)
        : await superAdminService.activateAdmin(admin.id);
      onUpdated(updated);
    } catch (err) {
      setError(extractApiError(err, "Couldn't update status."));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium text-slate-900">
        {admin.full_name}
        {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
      </TableCell>
      <TableCell className="text-slate-500">{admin.email}</TableCell>
      <TableCell>
        {isSelf ? (
          <Badge variant="outline">{roleLabel(admin.role)}</Badge>
        ) : (
          <select
            className="h-8 rounded-3xl border border-transparent bg-input/50 px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            value={admin.role}
            disabled={isSavingRole}
            onChange={(e) => handleRoleChange(e.target.value as AdminTierRole)}
          >
            {ADMIN_TIER_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        )}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </TableCell>
      <TableCell>
        <Badge variant={admin.is_active ? "secondary" : "destructive"}>
          {admin.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isTogglingStatus || isSelf}
          title={isSelf ? "You cannot deactivate your own account" : undefined}
          onClick={handleToggleStatus}
        >
          {admin.is_active ? "Deactivate" : "Activate"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
