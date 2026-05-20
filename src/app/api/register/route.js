import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Path for local dev fallback database
const LOCAL_DB_PATH = path.join(process.cwd(), "registrations_dev.json");

// Helper to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Helper for local dev fallback database operations
async function getLocalRegistrations() {
  try {
    const data = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty list
    return [];
  }
}

async function saveLocalRegistration(registration) {
  const registrations = await getLocalRegistrations();
  registrations.push(registration);
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(registrations, null, 2), "utf-8");
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { fullName, email, phone, focus, church } = body;

    // 1. Server-side Validation
    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: "Full Name is required." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid Email Address is required." },
        { status: 400 }
      );
    }

    const validFocuses = ["video", "audio", "design", "social", "content"];
    if (!focus || !validFocuses.includes(focus)) {
      return NextResponse.json(
        { error: "Please select a valid media focus track." },
        { status: 400 }
      );
    }

    // Prepare clean sanitized record
    const registrationRecord = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : "",
      focus,
      church: church ? church.trim() : "",
      registeredAt: new Date().toISOString(),
    };

    // 2. Database Integration Selector
    
    // --- INTEGRATION: Supabase REST API (if SUPABASE_URL and SUPABASE_ANON_KEY are configured) ---
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, ""); // Strip trailing slash
        const headers = {
          "apikey": process.env.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        };

        // 1. Check duplicate email using Supabase REST API (GET)
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/registrations?email=eq.${encodeURIComponent(registrationRecord.email)}`,
          { method: "GET", headers }
        );

        if (checkRes.ok) {
          const matchingRows = await checkRes.json();
          if (matchingRows.length > 0) {
            return NextResponse.json(
              { error: "This email address is already registered." },
              { status: 409 }
            );
          }
        }

        // 2. Insert record using Supabase REST API (POST)
        const insertPayload = {
          id: registrationRecord.id,
          full_name: registrationRecord.fullName,
          email: registrationRecord.email,
          phone: registrationRecord.phone,
          focus: registrationRecord.focus,
          church: registrationRecord.church,
          registered_at: registrationRecord.registeredAt
        };

        const insertRes = await fetch(`${supabaseUrl}/rest/v1/registrations`, {
          method: "POST",
          headers,
          body: JSON.stringify(insertPayload)
        });

        if (!insertRes.ok) {
          const errData = await insertRes.json().catch(() => ({}));
          console.error("[DATABASE ERROR] Supabase insertion failed:", errData);
          return NextResponse.json(
            { error: "Database transaction failed. Please try again." },
            { status: 500 }
          );
        }

        console.log(`[DATABASE] Saved registration to Supabase REST: ${registrationRecord.email}`);
        return NextResponse.json({
          success: true,
          message: "Registration completed successfully.",
          registration: registrationRecord,
          database: "Supabase"
        });
      } catch (sbError) {
        console.error("[DATABASE ERROR] Supabase REST connection failed:", sbError);
        // Fail-safe: let it try other databases or proceed to local file fallback
      }
    }

    // --- INTEGRATION: PostreSQL / Supabase Direct (if DATABASE_URL is configured) ---
    else if (process.env.DATABASE_URL) {
      try {
        const { Pool } = require("pg");
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        // Create table if it doesn't exist (production safety migration)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS registrations (
            id VARCHAR(50) PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            focus VARCHAR(30) NOT NULL,
            church VARCHAR(100),
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Check duplicate email
        const checkResult = await pool.query(
          "SELECT id FROM registrations WHERE email = $1",
          [registrationRecord.email]
        );
        if (checkResult.rows.length > 0) {
          await pool.end();
          return NextResponse.json(
            { error: "This email address is already registered." },
            { status: 409 }
          );
        }

        // Insert record
        await pool.query(
          `INSERT INTO registrations (id, full_name, email, phone, focus, church, registered_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            registrationRecord.id,
            registrationRecord.fullName,
            registrationRecord.email,
            registrationRecord.phone,
            registrationRecord.focus,
            registrationRecord.church,
            registrationRecord.registeredAt
          ]
        );
        
        await pool.end();
        console.log(`[DATABASE] Saved registration to cloud Postgres: ${registrationRecord.email}`);
        return NextResponse.json({
          success: true,
          message: "Registration successfully saved to database.",
          registration: registrationRecord,
          database: "PostgreSQL"
        });
      } catch (dbError) {
        console.error("[DATABASE ERROR] Postgres connection failed, failing secure project:", dbError);
        return NextResponse.json(
          { error: "Database transaction failed. Please try again." },
          { status: 500 }
        );
      }
    }

    // --- INTEGRATION: Firebase Firestore (if Firebase SDK keys are configured in env) ---
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const admin = require("firebase-admin");
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
          });
        }
        const db = admin.firestore();
        const ref = db.collection("registrations");

        // Duplicate Check
        const snapshot = await ref.where("email", "==", registrationRecord.email).get();
        if (!snapshot.empty) {
          return NextResponse.json(
            { error: "This email address is already registered." },
            { status: 409 }
          );
        }

        // Insert
        await ref.doc(registrationRecord.id).set(registrationRecord);
        console.log(`[DATABASE] Saved registration to Firebase Firestore: ${registrationRecord.email}`);
        return NextResponse.json({
          success: true,
          message: "Registration successfully saved to database.",
          registration: registrationRecord,
          database: "Firebase"
        });
      } catch (fbError) {
        console.error("[DATABASE ERROR] Firebase transaction failed:", fbError);
        return NextResponse.json(
          { error: "Database connection failed. Please try again." },
          { status: 500 }
        );
      }
    }

    // --- FALLBACK: High-Fidelity Local JSON file database (Default for dev/staging) ---
    else {
      const registrations = await getLocalRegistrations();
      
      // Duplicate email check
      const duplicate = registrations.find((r) => r.email === registrationRecord.email);
      if (duplicate) {
        return NextResponse.json(
          { error: "This email address is already registered." },
          { status: 409 }
        );
      }

      await saveLocalRegistration(registrationRecord);
      console.warn(`[DATABASE WARNING] No environment credentials set for Supabase, Postgres or Firebase. Falling back to local file DB: ${LOCAL_DB_PATH}`);
      return NextResponse.json({
        success: true,
        message: "Registration completed successfully.",
        registration: registrationRecord,
        database: "LocalJSON"
      });
    }

  } catch (error) {
    console.error("[API ERROR] Unexpected router exception:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred. Please try again." },
      { status: 500 }
    );
  }
}
