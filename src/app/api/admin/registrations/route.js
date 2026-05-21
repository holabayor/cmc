import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const LOCAL_DB_PATH = path.join(process.cwd(), "registrations_dev.json");

// Helper to sanitize environment variables
const sanitizeEnvVar = (val) => {
  if (!val) return "";
  let cleaned = val.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
};

// Initialize Firebase Admin SDK
function getFirebaseAdmin() {
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    const projectId = sanitizeEnvVar(process.env.FIREBASE_PROJECT_ID);
    const clientEmail = sanitizeEnvVar(process.env.FIREBASE_CLIENT_EMAIL);
    const privateKey = sanitizeEnvVar(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  return admin;
}

// Passphrase checker
const isAuthorized = (req) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || "admin123").trim();
  return token === adminPassword;
};

// Helper to fetch registrations locally
async function getLocalRegistrations() {
  try {
    const data = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper to save registrations locally
async function saveLocalRegistrations(registrations) {
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(registrations, null, 2), "utf-8");
}

// GET all registrations (Admin Only)
export async function GET(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    let registrations = [];

    // --- FETCH: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const admin = getFirebaseAdmin();
      const db = admin.firestore();
      const snapshot = await db.collection("registrations").orderBy("registeredAt", "desc").get();
      snapshot.forEach(doc => {
        registrations.push(doc.data());
      });
    }

    // --- FETCH: PostgreSQL / Supabase ---
    else if (process.env.DATABASE_URL) {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      const res = await pool.query("SELECT * FROM registrations ORDER BY registered_at DESC");
      
      registrations = res.rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone || "",
        focus: row.focus,
        church: row.church || "",
        registeredAt: new Date(row.registered_at).toISOString(),
        checkedIn: row.checked_in ?? false,
        checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).toISOString() : null
      }));
      await pool.end();
    }

    // --- FALLBACK: Local JSON database ---
    else {
      registrations = await getLocalRegistrations();
      // Sort desc
      registrations.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    }

    return NextResponse.json({
      success: true,
      registrations
    });

  } catch (error) {
    console.error("[API ADMIN REGISTRATIONS ERROR] GET list error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve registrations." },
      { status: 500 }
    );
  }
}

// PATCH Toggle Check-In Status (Admin Only)
export async function PATCH(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { id, checkedIn } = body;

    if (!id) {
      return NextResponse.json({ error: "Attendee ID is required." }, { status: 400 });
    }

    const checkedInAt = checkedIn ? new Date().toISOString() : null;

    // --- UPDATE: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const admin = getFirebaseAdmin();
      const db = admin.firestore();
      const attendeeRef = db.collection("registrations").doc(id);
      const doc = await attendeeRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Registration record not found." }, { status: 444 });
      }
      await attendeeRef.update({
        checkedIn,
        checkedInAt
      });
      console.log(`[DATABASE] Firebase: Check-in toggled for ID ${id} to ${checkedIn}`);
    }

    // --- UPDATE: PostgreSQL / Supabase ---
    else if (process.env.DATABASE_URL) {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      // Ensure checked_in and checked_in_at columns exist
      await pool.query(`
        ALTER TABLE registrations 
        ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP DEFAULT NULL
      `);

      const res = await pool.query(
        "UPDATE registrations SET checked_in = $1, checked_in_at = $2 WHERE id = $3",
        [checkedIn, checkedInAt, id]
      );

      if (res.rowCount === 0) {
        await pool.end();
        return NextResponse.json({ error: "Registration record not found." }, { status: 444 });
      }
      await pool.end();
      console.log(`[DATABASE] Postgres: Check-in toggled for ID ${id} to ${checkedIn}`);
    }

    // --- UPDATE: Local JSON Fallback ---
    else {
      const registrations = await getLocalRegistrations();
      const attendeeIndex = registrations.findIndex(r => r.id === id);
      if (attendeeIndex === -1) {
        return NextResponse.json({ error: "Registration record not found." }, { status: 444 });
      }

      registrations[attendeeIndex].checkedIn = checkedIn;
      registrations[attendeeIndex].checkedInAt = checkedInAt;
      
      await saveLocalRegistrations(registrations);
      console.log(`[DATABASE] Local JSON: Check-in toggled for ID ${id} to ${checkedIn}`);
    }

    return NextResponse.json({
      success: true,
      message: checkedIn ? "Check-in completed successfully." : "Check-in reverted successfully.",
      attendee: { id, checkedIn, checkedInAt }
    });

  } catch (error) {
    console.error("[API ADMIN REGISTRATIONS ERROR] PATCH check-in error:", error);
    return NextResponse.json(
      { error: "Failed to update check-in status." },
      { status: 500 }
    );
  }
}

// DELETE Attendee Registration (Admin Only)
export async function DELETE(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Attendee ID is required." }, { status: 400 });
    }

    // --- DELETE: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const admin = getFirebaseAdmin();
      const db = admin.firestore();
      const attendeeRef = db.collection("registrations").doc(id);
      const doc = await attendeeRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Registration record not found." }, { status: 444 });
      }
      await attendeeRef.delete();
      console.log(`[DATABASE] Firebase: Registration deleted for ID ${id}`);
    }

    // --- DELETE: PostgreSQL / Supabase ---
    else if (process.env.DATABASE_URL) {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const res = await pool.query(
        "DELETE FROM registrations WHERE id = $1",
        [id]
      );

      if (res.rowCount === 0) {
        await pool.end();
        return NextResponse.json({ error: "Registration record not found." }, { status: 444 });
      }
      await pool.end();
      console.log(`[DATABASE] Postgres: Registration deleted for ID ${id}`);
    }

    // --- DELETE: Local JSON Fallback ---
    else {
      const registrations = await getLocalRegistrations();
      const attendeeIndex = registrations.findIndex(r => r.id === id);
      if (attendeeIndex === -1) {
        return NextResponse.json({ error: "Registration record not found." }, { status: 444 });
      }

      registrations.splice(attendeeIndex, 1);
      await saveLocalRegistrations(registrations);
      console.log(`[DATABASE] Local JSON: Registration deleted for ID ${id}`);
    }

    return NextResponse.json({
      success: true,
      message: "Registration deleted successfully.",
      id
    });

  } catch (error) {
    console.error("[API ADMIN REGISTRATIONS ERROR] DELETE participant error:", error);
    return NextResponse.json(
      { error: "Failed to delete participant." },
      { status: 500 }
    );
  }
}
