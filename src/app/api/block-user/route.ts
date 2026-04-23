import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const action = body.action === "unblock" ? "unblock" : "block";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single<{ role: string }>();

    if (!profile || profile.role !== "founder") {
      return NextResponse.json({ error: "Only founder can manage user block status" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 });
    }

    const targetUser = usersData.users.find((candidate) => candidate.email?.toLowerCase() === email);

    if (!targetUser) {
      return NextResponse.json({ error: "No user found for that email" }, { status: 404 });
    }

    const metadata = {
      ...(targetUser.user_metadata ?? {}),
      blocked: action === "block",
      blocked_at: action === "block" ? new Date().toISOString() : null,
    };

    const { error } = await admin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: metadata,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: action === "block" ? "User blocked successfully" : "User unblocked successfully" },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update user block status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}