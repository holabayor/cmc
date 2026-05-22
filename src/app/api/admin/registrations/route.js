import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Helper to resolve dynamic database paths for read-only serverless environments like Vercel
const getDbPaths = () => {
  const isServerless = process.env.VERCEL || process.env.LAMBDA_TASK_ROOT || process.env.NODE_ENV === "production";
  if (isServerless) {
    return {
      registrations: path.join("/tmp", "registrations_dev.json")
    };
  }
  return {
    registrations: path.join(/*turbopackIgnore: true*/ process.cwd(), "registrations_dev.json")
  };
};

const DB_PATHS = getDbPaths();
const LOCAL_DB_PATH = DB_PATHS.registrations;

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

// Helper to sanitize private keys robustly for serverless and multiline environments (handles JSON escaped quotes, carriage returns, and newlines)
const sanitizePrivateKey = (val) => {
  if (!val) return "";
  let cleaned = val.trim();
  // Strip any surrounding escaped or unescaped quotes (e.g. ", ', \", \')
  cleaned = cleaned.replace(/^\\?['"]|\\?['"]$/g, "");
  // Replace escaped newlines
  cleaned = cleaned.replace(/\\n/g, "\n");
  // Remove carriage returns
  cleaned = cleaned.replace(/\r/g, "");
  return cleaned.trim();
};

// Initialize Firebase Admin SDK
function getFirebaseAdmin() {
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    const projectId = sanitizeEnvVar(process.env.FIREBASE_PROJECT_ID);
    const clientEmail = sanitizeEnvVar(process.env.FIREBASE_CLIENT_EMAIL);
    const privateKey = sanitizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
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
  try {
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(registrations, null, 2), "utf-8");
  } catch (error) {
    console.error("[DATABASE ERROR] Failed to save local registrations JSON:", error);
    throw new Error("Failed to write to local registrations database: " + error.message);
  }
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
      try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const snapshot = await db.collection("registrations").orderBy("registeredAt", "desc").get();
        snapshot.forEach(doc => {
          registrations.push(doc.data());
        });
      } catch (fbError) {
        console.error("[API ADMIN REGISTRATIONS ERROR] Firebase fetch failed, trying fallback:", fbError);
      }
    }

    // --- FETCH: PostgreSQL / Supabase ---
    if (registrations.length === 0 && process.env.DATABASE_URL) {
      try {
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
      } catch (pgError) {
        console.error("[API ADMIN REGISTRATIONS ERROR] PostgreSQL fetch failed, trying fallback:", pgError);
      }
    }

    // --- FALLBACK: Local JSON database ---
    if (registrations.length === 0) {
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
    let updated = false;
    let databaseBackend = "";

    // --- UPDATE: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const attendeeRef = db.collection("registrations").doc(id);
        const doc = await attendeeRef.get();
        if (doc.exists) {
          await attendeeRef.update({
            checkedIn,
            checkedInAt
          });
          updated = true;
          databaseBackend = "Firebase";
          console.log(`[DATABASE] Firebase: Check-in toggled for ID ${id} to ${checkedIn}`);
        } else {
          console.warn(`[DATABASE WARNING] Firebase: Registration record not found for ID ${id}`);
        }
      } catch (fbError) {
        console.error("[DATABASE ERROR] Firebase check-in update failed, trying fallback:", fbError);
      }
    }

    // --- UPDATE: PostgreSQL / Supabase ---
    if (!updated && process.env.DATABASE_URL) {
      try {
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

        if (res.rowCount > 0) {
          updated = true;
          databaseBackend = "PostgreSQL";
          console.log(`[DATABASE] Postgres: Check-in toggled for ID ${id} to ${checkedIn}`);
        } else {
          console.warn(`[DATABASE WARNING] Postgres: Registration record not found for ID ${id}`);
        }
        await pool.end();
      } catch (pgError) {
        console.error("[DATABASE ERROR] PostgreSQL check-in update failed, trying fallback:", pgError);
      }
    }

    // --- UPDATE: Local JSON Fallback ---
    if (!updated) {
      try {
        const registrations = await getLocalRegistrations();
        const attendeeIndex = registrations.findIndex(r => r.id === id);
        if (attendeeIndex === -1) {
          return NextResponse.json({ error: "Registration record not found across all databases." }, { status: 444 });
        }

        registrations[attendeeIndex].checkedIn = checkedIn;
        registrations[attendeeIndex].checkedInAt = checkedInAt;
        
        await saveLocalRegistrations(registrations);
        updated = true;
        databaseBackend = "LocalJSON";
        console.log(`[DATABASE] Local JSON: Check-in toggled for ID ${id} to ${checkedIn}`);
      } catch (localError) {
        console.error("[DATABASE ERROR] Local JSON check-in update failed:", localError);
        return NextResponse.json({ error: "Failed to update check-in status across all fallback options." }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: checkedIn ? "Check-in completed successfully." : "Check-in reverted successfully.",
      database: databaseBackend,
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

    let deleted = false;
    let databaseBackend = "";

    // --- DELETE: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const attendeeRef = db.collection("registrations").doc(id);
        const doc = await attendeeRef.get();
        if (doc.exists) {
          await attendeeRef.delete();
          deleted = true;
          databaseBackend = "Firebase";
          console.log(`[DATABASE] Firebase: Registration deleted for ID ${id}`);
        } else {
          console.warn(`[DATABASE WARNING] Firebase: Registration record not found for deletion ID ${id}`);
        }
      } catch (fbError) {
        console.error("[DATABASE ERROR] Firebase registration deletion failed, trying fallback:", fbError);
      }
    }

    // --- DELETE: PostgreSQL / Supabase ---
    if (!deleted && process.env.DATABASE_URL) {
      try {
        const { Pool } = require("pg");
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        const res = await pool.query(
          "DELETE FROM registrations WHERE id = $1",
          [id]
        );

        if (res.rowCount > 0) {
          deleted = true;
          databaseBackend = "PostgreSQL";
          console.log(`[DATABASE] Postgres: Registration deleted for ID ${id}`);
        } else {
          console.warn(`[DATABASE WARNING] Postgres: Registration record not found for deletion ID ${id}`);
        }
        await pool.end();
      } catch (pgError) {
        console.error("[DATABASE ERROR] PostgreSQL registration deletion failed, trying fallback:", pgError);
      }
    }

    // --- DELETE: Local JSON Fallback ---
    if (!deleted) {
      try {
        const registrations = await getLocalRegistrations();
        const attendeeIndex = registrations.findIndex(r => r.id === id);
        if (attendeeIndex === -1) {
          return NextResponse.json({ error: "Registration record not found across all databases." }, { status: 444 });
        }

        registrations.splice(attendeeIndex, 1);
        await saveLocalRegistrations(registrations);
        deleted = true;
        databaseBackend = "LocalJSON";
        console.log(`[DATABASE] Local JSON: Registration deleted for ID ${id}`);
      } catch (localError) {
        console.error("[DATABASE ERROR] Local JSON registration deletion failed:", localError);
        return NextResponse.json({ error: "Failed to delete participant across all fallback options." }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Registration deleted successfully.",
      database: databaseBackend,
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
