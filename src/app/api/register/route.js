import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Helper to resolve dynamic database paths for read-only serverless environments like Vercel
const getDbPaths = () => {
  const isServerless = process.env.VERCEL || process.env.LAMBDA_TASK_ROOT || process.env.NODE_ENV === "production";
  if (isServerless) {
    return {
      config: path.join("/tmp", "config_dev.json"),
      registrations: path.join("/tmp", "registrations_dev.json")
    };
  }
  return {
    config: path.join(/*turbopackIgnore: true*/ process.cwd(), "config_dev.json"),
    registrations: path.join(/*turbopackIgnore: true*/ process.cwd(), "registrations_dev.json")
  };
};

const DB_PATHS = getDbPaths();
const CONFIG_PATH = DB_PATHS.config;
const LOCAL_DB_PATH = DB_PATHS.registrations;

// Helper to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

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

// Helper for local dev fallback database operations
async function getLocalRegistrations() {
  try {
    const data = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveLocalRegistration(registration) {
  try {
    const registrations = await getLocalRegistrations();
    registrations.push(registration);
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(registrations, null, 2), "utf-8");
  } catch (error) {
    console.error("[DATABASE ERROR] Failed to save local registration JSON:", error);
    throw new Error("Failed to write to local registrations database: " + error.message);
  }
}

// Helper to send registration confirmation email using Resend HTTP API (No local SDK package dependency)
async function sendConfirmationEmail(record, focusTracks) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[EMAIL WARNING] RESEND_API_KEY env variable is not configured. Confirmation email skipped.");
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY.trim();

  try {
    // Select the sender email
    // Resend requires verified domains in production. By default, "onboarding@resend.dev" sends to the account owner.
    const senderEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    
    // Construct premium HSL dark-themed HTML email layout matching the app aesthetics
    const matchedTrack = focusTracks?.find(t => t.id === record.focus);
    const focusLabel = matchedTrack ? matchedTrack.name : (record.focus.charAt(0).toUpperCase() + record.focus.slice(1));
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Pass is Confirmed! - Kingdom Creatives</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #06050c; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .container { max-width: 550px; margin: 30px auto; background-color: #0b081c; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4); }
            .header { background: linear-gradient(135deg, #311b92, #110e1a); padding: 40px 30px; text-align: center; border-bottom: 1px dashed rgba(255, 255, 255, 0.1); }
            .header h1 { font-size: 26px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.5px; }
            .header p { font-size: 13px; color: #a78bfa; margin: 8px 0 0 0; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
            .content { padding: 35px 30px; color: #f2eff7; }
            .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; }
            .message { font-size: 14px; line-height: 1.6; color: rgba(242, 239, 247, 0.85); margin-bottom: 25px; }
            .ticket-card { background-color: #110e1a; border: 2px dashed rgba(167, 139, 250, 0.25); border-radius: 20px; padding: 25px; margin: 25px 0; position: relative; }
            .ticket-row { display: table; width: 100%; margin-bottom: 15px; }
            .ticket-row:last-child { margin-bottom: 0; }
            .ticket-col { display: table-cell; width: 50%; vertical-align: top; }
            .label { font-size: 9px; font-weight: 800; color: #918da3; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
            .value { font-size: 13px; font-weight: 700; color: #ffffff; }
            .track-pill { display: inline-block; background-color: rgba(167, 139, 250, 0.15); border: 1px solid rgba(167, 139, 250, 0.3); color: #a78bfa; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
            .qr-notice { text-align: center; font-size: 11px; color: #918da3; margin-top: 25px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; }
            .footer { background-color: #0c0a13; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); }
            .footer p { font-size: 10px; color: #474554; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://www.churchmedia.online/logo.png" alt="Kingdom Creatives Logo" width="180" style="display: block; margin: 0 auto 10px auto; max-width: 100%; border: none;" />
              <p style="margin: 0;">Creative Create 2026</p>
            </div>
            <div class="content">
              <h3 class="greeting">Hi ${record.fullName},</h3>
              <p class="message">Your registration has been successfully verified! Below is your official dynamic entry pass. Please save this email and present your Ticket ID or QR Code at the registration gate on event day for instant access.</p>
              
              <div class="ticket-card">
                <div class="ticket-row">
                  <div class="ticket-col">
                    <div class="label">ATTENDEE NAME</div>
                    <div class="value" style="font-size: 15px; color: #a78bfa;">${record.fullName}</div>
                  </div>
                  <div class="ticket-col" style="text-align: right;">
                    <div class="label">MEDIA FOCUS</div>
                    <div><span class="track-pill">${focusLabel}</span></div>
                  </div>
                </div>
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 15px 0;"></div>
                <div class="ticket-row">
                  <div class="ticket-col">
                    <div class="label">TICKET ID</div>
                    <div class="value" style="font-family: monospace; color: #f59e0b; font-size: 14px;">${record.id}</div>
                  </div>
                  <div class="ticket-col" style="text-align: right;">
                    <div class="label">CHURCH / DEPT</div>
                    <div class="value">${record.church || "Community Creator"}</div>
                  </div>
                </div>
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 15px 0;"></div>
                <div class="ticket-row">
                  <div class="ticket-col">
                    <div class="label">DATE & TIME</div>
                    <div class="value" style="font-size: 12px;">July 4th, 2026 • 10:00 AM</div>
                  </div>
                  <div class="ticket-col" style="text-align: right;">
                    <div class="label">VENUE</div>
                    <div class="value" style="font-size: 11px;">Clemzeal Hall, Uniosun, Osogbo</div>
                  </div>
                </div>
              </div>

              <!-- Dynamic QR Code for Gate Entry -->
              <div style="text-align: center; margin: 30px 0 20px 0;">
                <div style="display: inline-block; background-color: #ffffff; padding: 12px; border-radius: 20px; border: 2px solid rgba(167, 139, 250, 0.3); box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(record.id)}&color=0b081c&bgcolor=ffffff" 
                    alt="Ticket QR Code" 
                    width="120" 
                    height="120" 
                    style="display: block; border-radius: 8px;"
                  />
                </div>
                <div style="font-size: 10px; color: #a78bfa; font-weight: 700; margin-top: 10px; letter-spacing: 1.5px; text-transform: uppercase;">
                  SCAN GATE PASS AT THE DOOR
                </div>
              </div>

              <div class="qr-notice">
                Bring this Ticket ID or scan your gate pass above from your phone for seamless entry. We are excited to create with you!
              </div>
            </div>
            <div class="footer">
              <p>© 2026 Kingdom Creatives. Clemzeal Hall, Uniosun, Osogbo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [record.email],
        subject: `Your Pass is Confirmed! Ticket ID: ${record.id}`,
        html: emailHtml
      })
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[EMAIL SUCCESS] Confirmation email successfully sent via Resend API to ${record.email}. Resend ID: ${data.id}`);
    } else {
      const errText = await res.text();
      if (res.status === 403) {
        console.warn(`\n[RESEND DEVELOPER NOTE] Resend API responded with Status 403 (Validation Error).
This is expected behavior for free sandbox Resend API keys:
• By default, Resend only allows test emails to be sent to your own verified account email address.
• To send emails to external registrants (${record.email}), you must verify your custom domain at https://resend.com/domains and configure the RESEND_FROM_EMAIL environment variable.
• Registrations are still successfully processed and saved to your database!\n`);
      } else {
        console.error(`[EMAIL ERROR] Resend API responded with status ${res.status}:`, errText);
      }
    }
  } catch (err) {
    console.error("[EMAIL ERROR] Failed to send confirmation email through Resend API:", err);
  }
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

    // (Focus validation deferred until configuration is retrieved below)

    // 2. Fetch Active Config & Counts for Enforcing Limits
    let config = null;
    let currentCount = 0;

    // --- CHECK CONFIG: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
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
        const db = admin.firestore();
        const configDoc = await db.collection("config").doc("landingPage").get();
        if (configDoc.exists) {
          config = configDoc.data();
        }
        const registrationsSnapshot = await db.collection("registrations").get();
        currentCount = registrationsSnapshot.size;
      } catch (fbErr) {
        console.error("[REGISTRATION] Firebase limits check failed, falling back:", fbErr);
      }
    }

    // --- CHECK CONFIG: PostgreSQL / Supabase ---
    if (!config && process.env.DATABASE_URL) {
      try {
        const { Pool } = require("pg");
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });

        // Ensure database table and configuration schemas are migrated
        await pool.query(`
          CREATE TABLE IF NOT EXISTS registrations (
            id VARCHAR(50) PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            focus VARCHAR(30) NOT NULL,
            church VARCHAR(100),
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            checked_in BOOLEAN DEFAULT FALSE,
            checked_in_at TIMESTAMP DEFAULT NULL
          )
        `);

        // Check if configurations exists
        await pool.query(`
          CREATE TABLE IF NOT EXISTS configurations (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT NOT NULL
          )
        `);

        const configRes = await pool.query("SELECT value FROM configurations WHERE key = 'landingPage'");
        if (configRes.rows.length > 0) {
          config = JSON.parse(configRes.rows[0].value);
        }

        const countRes = await pool.query("SELECT COUNT(*) FROM registrations");
        currentCount = parseInt(countRes.rows[0].count, 10) || 0;
        await pool.end();
      } catch (pgErr) {
        console.error("[REGISTRATION] PostgreSQL limits check failed, falling back:", pgErr);
      }
    }

    // --- CHECK CONFIG: Fallback Local JSON ---
    if (!config) {
      try {
        const data = await fs.readFile(CONFIG_PATH, "utf-8");
        config = JSON.parse(data);
      } catch (err) {}
      
      try {
        const regData = await fs.readFile(LOCAL_DB_PATH, "utf-8");
        const registrations = JSON.parse(regData);
        currentCount = registrations.length;
      } catch (err) {}
    }

    // Dynamic Focus validation
    const dynamicFocusTracks = config?.focusTracks || [
      { id: "video", name: "Video Production" },
      { id: "audio", name: "Audio & Sound" },
      { id: "design", name: "Graphic Design" },
      { id: "social", name: "Social Media" },
      { id: "content", name: "Content Strategy" }
    ];
    const validFocuses = dynamicFocusTracks.map(t => t.id);
    if (!focus || !validFocuses.includes(focus)) {
      return NextResponse.json(
        { error: "Please select a valid media focus track." },
        { status: 400 }
      );
    }

    // Enforce limits and activation state
    const limit = config ? config.registrationLimit : 100;
    const isEnabled = config ? config.isRegistrationEnabled : true;
    const closedMessage = config ? config.registrationClosedMessage : "Registration is now full. Thank you for your interest!";

    if (!isEnabled) {
      return NextResponse.json({ error: closedMessage }, { status: 403 });
    }

    if (currentCount >= limit) {
      return NextResponse.json({ error: closedMessage }, { status: 403 });
    }

    // Prepare clean sanitized record with default check-in values
    // Generate a premium, high-readability 6-character short ticket ID (e.g. KC-F8Y2KB)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let shortCode = "";
    for (let i = 0; i < 6; i++) {
      shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const registrationRecord = {
      id: `KC-${shortCode}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : "",
      focus,
      church: church ? church.trim() : "",
      registeredAt: new Date().toISOString(),
      checkedIn: false,
      checkedInAt: null
    };

    // 3. Database Integration Selector
    let saveResponse = null;

    // --- INTEGRATION: Supabase REST API (if SUPABASE_URL and SUPABASE_ANON_KEY are configured) ---
    if (!saveResponse && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, ""); // Strip trailing slash
        const headers = {
          "apikey": process.env.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        };

        // Check duplicate email using Supabase REST API (GET)
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/registrations?email=eq.${encodeURIComponent(registrationRecord.email)}`,
          { method: "GET", headers }
        );

        if (checkRes.ok) {
          const matchingRows = await checkRes.json();
          if (matchingRows.length > 0) {
            saveResponse = NextResponse.json(
              { error: "This email address is already registered." },
              { status: 409 }
            );
          }
        }

        if (!saveResponse) {
          // Insert record with check-in defaults
          const insertPayload = {
            id: registrationRecord.id,
            full_name: registrationRecord.fullName,
            email: registrationRecord.email,
            phone: registrationRecord.phone,
            focus: registrationRecord.focus,
            church: registrationRecord.church,
            registered_at: registrationRecord.registeredAt,
            checked_in: false,
            checked_in_at: null
          };

          const insertRes = await fetch(`${supabaseUrl}/rest/v1/registrations`, {
            method: "POST",
            headers,
            body: JSON.stringify(insertPayload)
          });

          if (!insertRes.ok) {
            const errData = await insertRes.json().catch(() => ({}));
            console.error("[DATABASE ERROR] Supabase insertion failed:", errData);
            throw new Error("Supabase insert request failed");
          }

          console.log(`[DATABASE] Saved registration to Supabase REST: ${registrationRecord.email}`);
          await sendConfirmationEmail(registrationRecord, dynamicFocusTracks);
          saveResponse = NextResponse.json({
            success: true,
            message: "Registration completed successfully.",
            registration: registrationRecord,
            database: "Supabase"
          });
        }
      } catch (sbError) {
        console.error("[DATABASE ERROR] Supabase REST connection failed, trying next database:", sbError);
      }
    }

    // --- INTEGRATION: PostreSQL / Supabase Direct (if DATABASE_URL is configured) ---
    if (!saveResponse && process.env.DATABASE_URL) {
      try {
        const { Pool } = require("pg");
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });

        // Check duplicate email
        const checkResult = await pool.query(
          "SELECT id FROM registrations WHERE email = $1",
          [registrationRecord.email]
        );
        if (checkResult.rows.length > 0) {
          await pool.end();
          saveResponse = NextResponse.json(
            { error: "This email address is already registered." },
            { status: 409 }
          );
        } else {
          // Insert record
          await pool.query(
            `INSERT INTO registrations (id, full_name, email, phone, focus, church, registered_at, checked_in, checked_in_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              registrationRecord.id,
              registrationRecord.fullName,
              registrationRecord.email,
              registrationRecord.phone,
              registrationRecord.focus,
              registrationRecord.church,
              registrationRecord.registeredAt,
              false,
              null
            ]
          );
          
          await pool.end();
          console.log(`[DATABASE] Saved registration to cloud Postgres: ${registrationRecord.email}`);
          await sendConfirmationEmail(registrationRecord, dynamicFocusTracks);
          saveResponse = NextResponse.json({
            success: true,
            message: "Registration successfully saved to database.",
            registration: registrationRecord,
            database: "PostgreSQL"
          });
        }
      } catch (dbError) {
        console.error("[DATABASE ERROR] Postgres connection failed, trying next database:", dbError);
      }
    }

    // --- INTEGRATION: Firebase Firestore (if Firebase SDK keys are configured in env) ---
    if (!saveResponse && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
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
        const db = admin.firestore();
        const ref = db.collection("registrations");

        // Duplicate Check
        const snapshot = await ref.where("email", "==", registrationRecord.email).get();
        if (!snapshot.empty) {
          saveResponse = NextResponse.json(
            { error: "This email address is already registered." },
            { status: 409 }
          );
        } else {
          // Insert
          await ref.doc(registrationRecord.id).set(registrationRecord);
          console.log(`[DATABASE] Saved registration to Firebase Firestore: ${registrationRecord.email}`);
          await sendConfirmationEmail(registrationRecord, dynamicFocusTracks);
          saveResponse = NextResponse.json({
            success: true,
            message: "Registration successfully saved to database.",
            registration: registrationRecord,
            database: "Firebase"
          });
        }
      } catch (fbError) {
        console.error("[DATABASE ERROR] Firebase transaction failed, trying next database:", fbError);
      }
    }

    // --- FALLBACK: High-Fidelity Local JSON file database (Default for dev/staging) ---
    if (!saveResponse) {
      try {
        const registrations = await getLocalRegistrations();
        
        // Duplicate email check
        const duplicate = registrations.find((r) => r.email === registrationRecord.email);
        if (duplicate) {
          saveResponse = NextResponse.json(
            { error: "This email address is already registered." },
            { status: 409 }
          );
        } else {
          try {
            await saveLocalRegistration(registrationRecord);
            console.warn(`[DATABASE WARNING] No environment credentials set or cloud databases failed. Falling back to local file DB: ${LOCAL_DB_PATH}`);
            await sendConfirmationEmail(registrationRecord, dynamicFocusTracks);
            saveResponse = NextResponse.json({
              success: true,
              message: "Registration completed successfully.",
              registration: registrationRecord,
              database: "LocalJSON"
            });
          } catch (writeErr) {
            console.error("[DATABASE ERROR] Local JSON save failed:", writeErr);
            saveResponse = NextResponse.json(
              { error: "Failed to persist registration record: " + writeErr.message },
              { status: 500 }
            );
          }
        }
      } catch (readErr) {
        console.error("[DATABASE ERROR] Local JSON read failed:", readErr);
        saveResponse = NextResponse.json(
          { error: "Failed to read local registration records: " + readErr.message },
          { status: 500 }
        );
      }
    }

    return saveResponse;

  } catch (error) {
    console.error("[API ERROR] Unexpected router exception:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// GET Registration by Email Lookup (Public)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email parameter is required." }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();

    let attendee = null;

    // --- FETCH: Firebase ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
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
        const db = admin.firestore();
        const snapshot = await db.collection("registrations").where("email", "==", cleanEmail).get();
        if (!snapshot.empty) {
          attendee = snapshot.docs[0].data();
        }
      } catch (fbError) {
        console.error("[API GET REGISTRATION ERROR] Firebase lookup failed, trying fallback:", fbError);
      }
    }

    // --- FETCH: Postgres ---
    if (!attendee && process.env.DATABASE_URL) {
      try {
        const { Pool } = require("pg");
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        const res = await pool.query("SELECT * FROM registrations WHERE email = $1", [cleanEmail]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          attendee = {
            id: row.id,
            fullName: row.full_name,
            email: row.email,
            phone: row.phone || "",
            focus: row.focus,
            church: row.church || "",
            registeredAt: new Date(row.registered_at).toISOString(),
            checkedIn: row.checked_in ?? false
          };
        }
        await pool.end();
      } catch (pgError) {
        console.error("[API GET REGISTRATION ERROR] PostgreSQL lookup failed, trying fallback:", pgError);
      }
    }

    // --- FETCH: Local JSON ---
    if (!attendee) {
      const registrations = await getLocalRegistrations();
      attendee = registrations.find(r => r.email === cleanEmail) || null;
    }

    if (!attendee) {
      return NextResponse.json({ error: "No registration found for this email address." }, { status: 444 });
    }

    return NextResponse.json({
      success: true,
      registration: attendee
    });

  } catch (error) {
    console.error("[API GET REGISTRATION ERROR] Lookup error:", error);
    return NextResponse.json({ error: "Failed to look up registration." }, { status: 500 });
  }
}
