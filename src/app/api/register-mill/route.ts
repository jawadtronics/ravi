import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const millName = typeof body.mill_name === "string" ? body.mill_name.trim() : "";
    const centers = Array.isArray(body.centers)
      ? body.centers.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
      : [];
    const founderEmail = typeof body.founder_email === "string" ? body.founder_email.trim().toLowerCase() : "";
    const founderPassword = typeof body.founder_password === "string" ? body.founder_password : "";

    if (!millName || !centers.length || !founderEmail || !founderPassword) {
      return NextResponse.json(
        { error: "Missing required fields: mill_name, centers, founder_email, founder_password" },
        { status: 400 },
      );
    }

    if (founderPassword.length < 6) {
      return NextResponse.json({ error: "Founder password must be at least 6 characters." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();

    if (!ownerProfile || ownerProfile.role !== "owner") {
      return NextResponse.json({ error: "Only owner can register mills" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: millData, error: millError } = await admin
      .from("mills")
      .insert({ name: millName, owner_id: user.id })
      .select("id, name")
      .single<{ id: string; name: string }>();

    if (millError || !millData) {
      return NextResponse.json({ error: millError?.message ?? "Unable to create mill" }, { status: 400 });
    }

    const centerRows = centers.map((centerName) => ({
      mill_id: millData.id,
      name: centerName,
      location: null,
    }));

    const { data: createdCenters, error: centersError } = await admin
      .from("centers")
      .insert(centerRows)
      .select("id")
      .returns<Array<{ id: string }>>();

    if (centersError || !createdCenters?.length) {
      await admin.from("mills").delete().eq("id", millData.id);
      return NextResponse.json({ error: centersError?.message ?? "Unable to create centers" }, { status: 400 });
    }

    const primaryCenterId = createdCenters[0]?.id ?? null;

    const { data: founderCreateData, error: founderCreateError } = await admin.auth.admin.createUser({
      email: founderEmail,
      password: founderPassword,
      email_confirm: true,
      user_metadata: {
        name: `${millData.name} Founder`,
        cnic: "",
        phone: "",
        address: "",
        role: "founder",
        mill_id: millData.id,
        center_id: primaryCenterId,
        blocked: false,
      },
    });

    if (founderCreateError || !founderCreateData.user) {
      await admin.from("centers").delete().eq("mill_id", millData.id);
      await admin.from("mills").delete().eq("id", millData.id);
      return NextResponse.json({ error: founderCreateError?.message ?? "Unable to create founder user" }, { status: 400 });
    }

    const founderUserId = founderCreateData.user.id;

    const { error: profileUpsertError } = await admin.from("profiles").upsert(
      {
        id: founderUserId,
        name: `${millData.name} Founder`,
        cnic: "",
        phone: "",
        address: "",
        role: "founder",
        mill_id: millData.id,
        center_id: primaryCenterId,
      },
      { onConflict: "id" },
    );

    if (profileUpsertError) {
      await admin.auth.admin.deleteUser(founderUserId);
      await admin.from("centers").delete().eq("mill_id", millData.id);
      await admin.from("mills").delete().eq("id", millData.id);
      return NextResponse.json({ error: profileUpsertError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: "Mill, centers, and founder created successfully",
        mill_id: millData.id,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
