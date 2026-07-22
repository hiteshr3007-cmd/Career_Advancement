"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import AuthCard from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import authService from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authService.forgotPassword({ email });
      setIsSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send the reset code. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a 6-digit code to reset it"
      footer={
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {isSent ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            If an account exists for {email}, a 6-digit code is on its way. The code expires in 15 minutes.
          </p>
          <Button
            className="w-full"
            onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
          >
            I have my code
          </Button>
        </div>
      ) : (
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

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset code"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
