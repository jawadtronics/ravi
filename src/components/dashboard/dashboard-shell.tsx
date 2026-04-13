import Link from "next/link";
import { ReactNode } from "react";
import { Profile } from "@/types/app";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function DashboardShell({
  title,
  profile,
  children,
}: {
  title: string;
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8eb_0%,_#f8fafc_45%,_#e2e8f0_100%)]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Wheat Management</p>
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-slate-600 sm:block">
              {profile.name ?? "Unnamed User"} | {profile.role.replace("_", " ")}
            </p>
            <Link className="text-sm font-semibold text-slate-700 hover:text-amber-700" href="/dashboard">
              Home
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
