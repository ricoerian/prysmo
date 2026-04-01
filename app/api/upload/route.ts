import { getSession } from "@/app/_lib/auth";
import { supabase } from "@/app/_lib/supabase";
import { NextRequest } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;
const BUCKET_NAME = "prysmo";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: "File must be JPEG, PNG, WebP, or GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return Response.json(
        { error: `File must be under ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // --- AUTO-HEALING: Ensure bucket exists ---
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET_NAME);
    if (!bucket || bucketError) {
      console.log(`Auto-healing: Creating missing bucket "${BUCKET_NAME}"`);
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }
    // ------------------------------------------

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("SUPABASE STORAGE ERROR:", error);
      return Response.json({ 
        error: `Upload failed: ${error.message} (Bucket: ${BUCKET_NAME})`,
        details: error
      }, { status: 500 });
    }

    // Return the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return Response.json({ url: publicUrl });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("GENERIC UPLOAD ERROR:", error);
    return Response.json({ 
      error: "Internal server error during upload", 
      message: error.message 
    }, { status: 500 });
  }
}
