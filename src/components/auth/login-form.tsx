"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getDashboardRoute } from "@/lib/auth";
import { UserRole } from "@/types/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export function LoginForm() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "password">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("Unable to load authenticated user.");
      setLoading(false);
      return;
    }

    if (user.user_metadata?.blocked) {
      await supabase.auth.signOut();
      setErrorMessage("This account has been blocked. Contact the founder.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: UserRole }>();

    if (profileError || !profile) {
      setErrorMessage("Unable to fetch role from profiles table.");
      setLoading(false);
      return;
    }

    router.replace(getDashboardRoute(profile.role));
    router.refresh();
  }

  function openForgotPassword() {
    setForgotOpen(true);
    setForgotStep("email");
    setForgotEmail(email);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError(null);
    setForgotMessage(null);
  }

  function closeForgotPassword() {
    setForgotOpen(false);
    setForgotStep("email");
    setForgotEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError(null);
    setForgotMessage(null);
  }

  async function sendForgotOtp() {
    setForgotLoading(true);
    setForgotError(null);
    setForgotMessage(null);

    const normalizedEmail = forgotEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setForgotError("Please enter your email.");
      setForgotLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

    if (error) {
      setForgotError(error.message);
      setForgotLoading(false);
      return;
    }

    setForgotMessage("OTP has been sent to your email.");
    setForgotStep("otp");
    setForgotLoading(false);
  }

  async function verifyForgotOtp() {
    setForgotLoading(true);
    setForgotError(null);
    setForgotMessage(null);

    const normalizedOtp = otp.trim();
    if (!normalizedOtp) {
      setForgotError("Please enter the OTP.");
      setForgotLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: forgotEmail.trim().toLowerCase(),
      token: normalizedOtp,
      type: "recovery",
    });

    if (error) {
      setForgotError(error.message);
      setForgotLoading(false);
      return;
    }

    setForgotMessage("OTP verified. Enter your new password.");
    setForgotStep("password");
    setForgotLoading(false);
  }

  async function updateForgotPassword() {
    setForgotLoading(true);
    setForgotError(null);
    setForgotMessage(null);

    if (newPassword.length < 6) {
      setForgotError("Password must be at least 6 characters.");
      setForgotLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError("Password and confirm password do not match.");
      setForgotLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setForgotError(error.message);
      setForgotLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setPassword("");
    setForgotLoading(false);
    setForgotMessage("Password changed successfully. Please login with your new password.");

    setTimeout(() => {
      closeForgotPassword();
    }, 1000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Ravi Food Software</p>
        <h2 className="mb-2 text-2xl font-black text-slate-900">Wheat Weighing Portal</h2>
        <p className="mb-6 text-sm text-slate-600">Login once and get redirected to your role-specific dashboard.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </div>
          <div className="text-right">
            <button
              type="button"
              className="text-sm font-semibold text-amber-700 underline"
              onClick={openForgotPassword}
            >
              Forgot Password?
            </button>
          </div>
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          <Button type="submit" className="w-full" loading={loading}>
            Login
          </Button>
        </form>
      </Card>

      <Modal open={forgotOpen} title="Forgot Password" onClose={closeForgotPassword}>
        <div className="space-y-4">
          {forgotStep === "email" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Enter your email to receive OTP.</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => void sendForgotOtp()} loading={forgotLoading}>
                  Send OTP
                </Button>
              </div>
            </div>
          ) : null}

          {forgotStep === "otp" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Enter the OTP sent to your email.</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">OTP</label>
                <Input
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter OTP"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => setForgotStep("email")}>
                  Back
                </Button>
                <Button type="button" onClick={() => void verifyForgotOtp()} loading={forgotLoading}>
                  Verify OTP
                </Button>
              </div>
            </div>
          ) : null}

          {forgotStep === "password" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Enter your new password.</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => setForgotStep("otp")}>
                  Back
                </Button>
                <Button type="button" onClick={() => void updateForgotPassword()} loading={forgotLoading}>
                  Update Password
                </Button>
              </div>
            </div>
          ) : null}

          {forgotError ? <p className="text-sm text-red-600">{forgotError}</p> : null}
          {forgotMessage ? <p className="text-sm text-green-700">{forgotMessage}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
