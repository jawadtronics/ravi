import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardRoute } from "@/lib/auth";
import { Profile, UserRole } from "@/types/app";

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null } as const;
  }

  if (user.user_metadata?.blocked) {
    return { user: null, profile: null } as const;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, cnic, phone, address, role, mill_id, center_id, created_at")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile) {
    return { user: null, profile: null } as const;
  }

  if ((profile as Profile & { blocked?: boolean }).blocked) {
    return { user: null, profile: null } as const;
  }

  return { user, profile } as const;
}

export async function redirectIfAuthenticated() {
  const { profile } = await getSessionProfile();

  if (profile) {
    redirect(getDashboardRoute(profile.role));
  }
}

export async function requireRole(role: UserRole) {
  const { user, profile } = await getSessionProfile();

  if (!user || !profile) {
    redirect("/");
  }

  if (profile.role !== role) {
    redirect(getDashboardRoute(profile.role));
  }

  return { user, profile };
}

export async function requireAnyDashboardAccess() {
  const { user, profile } = await getSessionProfile();

  if (!user || !profile) {
    redirect("/");
  }

  return { user, profile };
}
