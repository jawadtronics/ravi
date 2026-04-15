import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_BUCKETS = new Set(["wheat-images"]);
const ALLOWED_FOLDERS = new Set(["car", "w1", "w2"]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const bucket = String(formData.get("bucket") ?? "");
    const folder = String(formData.get("folder") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${crypto.randomUUID()}.${extension}`;

    const { error } = await admin.storage.from(bucket).upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data } = admin.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({ url: data.publicUrl, path: filePath }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const bucket = String(body.bucket ?? "");
    const path = String(body.path ?? "");

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { error } = await admin.storage.from(bucket).remove([path]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "File deleted successfully" }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
