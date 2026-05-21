import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Passphrase checker
const isAuthorized = (req) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || "admin123").trim();
  return token === adminPassword;
};

export async function POST(req) {
  try {
    // 1. Authorization check
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // 2. Parse Form Data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    // Check if it's an image file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be a valid image." }, { status: 400 });
    }

    // 3. Prepare paths
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Clean up file name to prevent path traversal & formatting issues
    const rawName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `speaker_${Date.now()}_${rawName}`;
    const filePath = path.join(uploadDir, uniqueName);

    // 4. Save file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    console.log(`[FILE UPLOAD] Saved speaker photo: /uploads/${uniqueName}`);

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully.",
      url: `/uploads/${uniqueName}`
    });

  } catch (error) {
    console.error("[API ADMIN UPLOAD ERROR] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error occurred during file upload." },
      { status: 500 }
    );
  }
}
