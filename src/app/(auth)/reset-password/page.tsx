"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import AuthCard from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/api";
import authService from "@/services/auth.service";

const GENERIC_CODE_ERROR = "Invalid or expired code. Please check the code or request a new one.";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResendMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ email, code, new_password: password });
      setIsDone(true);
    } catch (err) {
      setError(extractApiError(err, GENERIC_CODE_ERROR));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    setError(null);
    setResendMessage(null);
    setIsResending(true);
    try {
      await authService.forgotPassword({ email });
      setResendMessage("If an account exists for that email, a new code is on its way.");
    } catch {
      setResendMessage("If an account exists for that email, a new code is on its way.");
    } finally {
      setIsResending(false);
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
      title="Enter your reset code"
      subtitle="Check your email for the 6-digit code we sent you"
      footer={
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="code" className="text-sm font-medium text-slate-700">
            6-digit code
          </label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>

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

        {resendMessage && !error && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {resendMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="w-full text-center text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50"
        >
          {isResending ? "Sending..." : "Resend code"}
        </button>
      </form>
    </AuthCard>
  );
}
