"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import AuthCard from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/api";
import authService from "@/services/auth.service";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title="Invalid reset link"
        subtitle="This password reset link is missing its token"
        footer={
          <Link href="/forgot-password" className="font-medium text-indigo-600 hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          Open the link from your email again, or request a new one.
        </p>
      </AuthCard>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ token, new_password: password });
      setIsDone(true);
    } catch (err) {
      setError(extractApiError(err, "Unable to reset your password. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <AuthCard title="Password updated" subtitle="You can now sign in with your new password">
        <Button className="w-full" onClick={() => router.replace("/login")}>
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a new password for your account"
      footer={
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            New password
          </label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
