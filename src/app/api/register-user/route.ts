import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const cnic = typeof body.cnic === "string" ? body.cnic.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const centerId = typeof body.center_id === "string" ? body.center_id.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const role = body.role;

    if (!name || !cnic || !email || !password || !centerId || !role) {
      return NextResponse.json(
        { error: "Missing required fields: name, cnic, email, password, center_id, role" },
        { status: 400 },
      );
    }

    if (
      role !== "owner" &&
      role !== "gate_person" &&
      role !== "weight_manager" &&
      role !== "center_manager" &&
      role !== "super_manager" &&
      role !== "founder"
    ) {
      return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Only founder can register users" }, { status: 403 });
    }

    if (role === "owner") {
      return NextResponse.json({ error: "Founder cannot create owner role users" }, { status: 403 });
    }

    const { data: center } = await supabase
      .from("centers")
      .select("id, mill_id")
      .eq("id", centerId)
      .single<{ id: string; mill_id: string | null }>();

    if (!center || center.mill_id !== profile.mill_id) {
      return NextResponse.json({ error: "Selected center is outside your mill" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        cnic,
        phone,
        address,
        role,
        mill_id: profile.mill_id,
        center_id: centerId,
        blocked: false,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
