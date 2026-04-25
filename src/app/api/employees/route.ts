import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmployeeRecord } from "@/types/app";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, mill_id")
      .eq("id", user.id)
      .single<{ role: string; mill_id: string | null }>();

    if (!profile || profile.role !== "founder") {
      return NextResponse.json({ error: "Only founder can view employees" }, { status: 403 });
    }

    const admin = createAdminClient();
    const [{ data: usersData, error: usersError }, { data: profilesData, error: profilesError }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("profiles").select("id, name, cnic, phone, address, role, mill_id, center_id, created_at"),
    ]);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 });
    }

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    const scopedProfiles = (profilesData ?? []).filter((entry) => entry.mill_id === profile.mill_id);
    const profileById = new Map(scopedProfiles.map((entry) => [entry.id, entry]));
    const employees = usersData.users
      .map((userRecord) => {
        const profileRecord = profileById.get(userRecord.id);

        if (!profileRecord) {
          return null;
        }

        return {
          ...profileRecord,
          email: userRecord.email ?? "",
          blocked: Boolean(userRecord.user_metadata?.blocked),
          last_sign_in_at: userRecord.last_sign_in_at ?? null,
          blocked_at: typeof userRecord.user_metadata?.blocked_at === "string" ? userRecord.user_metadata.blocked_at : null,
        } satisfies EmployeeRecord;
      })
      .filter(Boolean) as EmployeeRecord[];

    return NextResponse.json({ employees }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load employees";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}