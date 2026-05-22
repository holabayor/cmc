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

// Default Configuration Dataset for Seeding
const DEFAULT_CONFIG = {
  eventTitle: "Creative Create 2026",
  eventDate: "July 4th, 2026 • 10:00 AM",
  registrationLimit: 100,
  isRegistrationEnabled: true,
  registrationClosedMessage: "Registration is now full. Thank you for your interest!",
  speakers: [
    {
      id: "david",
      name: "David Okafor",
      role: "Creative Director",
      bio: "Award-winning media specialist with 10+ years leading creative campaigns for global faith brands. Expert in cinematic visual storytelling, corporate lighting design, and digital content direction.",
      session: "Cinematic Video Capture & Storytelling (Track Session 1)",
      focus: "video"
    },
    {
      id: "sarah",
      name: "Sarah Mensah",
      role: "Digital Evangelist",
      bio: "Pioneering strategist who has helped over 50 ministries scale their online global reach. Specializes in building organic, highly-engaged digital communities and virality engineering.",
      session: "Growth Hacking & Brand Building (Track Session 2)",
      focus: "social"
    },
    {
      id: "john",
      name: "Pastor John Doe",
      role: "Lead Pastor & Author",
      bio: "Visionary theological communicator passionate about equipping the next generation with creative excellence, strategic depth, and spiritual authority to impact the cultural digital frontiers.",
      session: "Keynote: Looping Gospel through Creativity (Morning)",
      focus: "content"
    },
    {
      id: "grace",
      name: "Sister Grace",
      role: "Content Strategy",
      bio: "Former advertising agency planner turned kingdom media advocate. Master of micro-content development, SEO copy writing, and intentional multi-channel publishing calendars.",
      session: "SEO, Copywriting & Dynamic Publishing (Track Session 2)",
      focus: "content"
    },
    {
      id: "emmanuel",
      name: "Bro Emmanuel",
      role: "Technical Director",
      bio: "Systems architect and audio engineer who designs high-fidelity broadcast setups for major international conferences. Expert in acoustics, livestream encoding, and low-latency network setups.",
      session: "Sound Engineering & Post-Production (Track Session 1)",
      focus: "audio"
    },
    {
      id: "blessing",
      name: "Blessing Watts",
      role: "Social Media Manager",
      bio: "Vibrant visual designer and organic marketer with a track record of driving massive online engagement. Passionate about brand consistency, layout aesthetics, and platform algorithms.",
      session: "Modern Branding & Social Media Architectures (Track Session 1)",
      focus: "design"
    }
  ],
  schedule: [
    {
      id: "evt_1",
      time: "09:00 AM",
      title: "Arrival, Networking & Check-In",
      category: "general",
      period: "morning",
      speaker: null,
      description: "Collect your custom badges, explore the creative hub, connect with other participants, and grab a morning coffee."
    },
    {
      id: "evt_2",
      time: "10:00 AM",
      title: "Keynote: Looping Gospel through Creativity",
      category: "general",
      period: "morning",
      speaker: "Pastor John Doe",
      description: "A foundational session addressing the theological and practical mandate for kingdom creators in a rapidly changing digital economy."
    },
    {
      id: "evt_3",
      time: "11:30 AM",
      title: "Track Session 1 (Choose One)",
      category: "tracks",
      period: "morning",
      tracks: [
        {
          name: "Video & Sound Track",
          title: "Cinematic Video Capture & High-Fidelity Audio Editing",
          speakers: "David Okafor & Bro Emmanuel"
        },
        {
          name: "Design & Social Track",
          title: "Modern Branding & Intentional Social Architectures",
          speakers: "Blessing Watts & Sister Grace"
        }
      ],
      description: "Deep dive workshops teaching technical workflows. Learn the absolute best techniques to record and style visuals and sound."
    },
    {
      id: "evt_4",
      time: "01:00 PM",
      title: "Community Lunch Break & Panel Circles",
      category: "general",
      period: "afternoon",
      speaker: null,
      description: "Enjoy catering on-site and connect with fellow creators in themed discussion circles based on your creative tracks."
    },
    {
      id: "evt_5",
      time: "02:00 PM",
      title: "Track Session 2 (Choose One)",
      category: "tracks",
      period: "afternoon",
      tracks: [
        {
          name: "Audio & Production Track",
          title: "Sound Engineering & Post-Production Broadcast Workflows",
          speakers: "Bro Emmanuel"
        },
        {
          name: "Social & Copy Track",
          title: "Growth Hacking, Search SEO & Creative Copywriting",
          speakers: "Sarah Mensah & Sister Grace"
        }
      ],
      description: "Advanced seminars designed to enhance your publishing speed, discoverability, search engine indexing, and output quality."
    },
    {
      id: "evt_6",
      time: "04:00 PM",
      title: "Frontier Creatives: The Future of Kingdom Media",
      category: "general",
      period: "afternoon",
      speaker: "All Featured Speakers",
      description: "An open panel and interactive Q&A session covering AI tools, cloud collaboration, content longevity, and digital missions."
    }
  ]
};

// GET Dynamic Configuration and current registration count
export async function GET(req) {
  try {
    let config = null;
    let registrationCount = 0;

    // --- CONNECT: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const configDoc = await db.collection("config").doc("landingPage").get();
        
        if (configDoc.exists) {
          config = configDoc.data();
        } else {
          // Automatic Seeding for Firebase Firestore
          config = { ...DEFAULT_CONFIG };
          await db.collection("config").doc("landingPage").set(config);
          console.log("[DATABASE] Firebase Config database automatically seeded!");
        }

        // Get live registration count
        const registrationsSnapshot = await db.collection("registrations").get();
        registrationCount = registrationsSnapshot.size;
      } catch (fbError) {
        console.error("[API CONFIG ERROR] Firebase config fetch failed, falling back:", fbError);
      }
    }

    // --- CONNECT: PostgreSQL / Supabase ---
    if (!config && process.env.DATABASE_URL) {
      try {
        const { Pool } = require("pg");
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });

        // Initialize settings table if not existing
        await pool.query(`
          CREATE TABLE IF NOT EXISTS configurations (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT NOT NULL
          )
        `);

        // Check if config exists
        const res = await pool.query("SELECT value FROM configurations WHERE key = 'landingPage'");
        if (res.rows.length > 0) {
          config = JSON.parse(res.rows[0].value);
        } else {
          // Seed Postgres config
          config = { ...DEFAULT_CONFIG };
          await pool.query("INSERT INTO configurations (key, value) VALUES ($1, $2)", [
            "landingPage",
            JSON.stringify(config)
          ]);
          console.log("[DATABASE] PostgreSQL Config database automatically seeded!");
        }

        // Get count
        const countRes = await pool.query("SELECT COUNT(*) FROM registrations");
        registrationCount = parseInt(countRes.rows[0].count, 10) || 0;
        await pool.end();
      } catch (pgError) {
        console.error("[API CONFIG ERROR] Postgres config fetch failed, falling back:", pgError);
      }
    }

    // --- FALLBACK: Local JSON database ---
    if (!config) {
      try {
        const data = await fs.readFile(CONFIG_PATH, "utf-8");
        config = JSON.parse(data);
      } catch (err) {
        // Seed Local JSON
        config = { ...DEFAULT_CONFIG };
        try {
          await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
          console.log("[DATABASE] Local config JSON automatically seeded!");
        } catch (writeErr) {
          console.warn("[DATABASE] Local config JSON could not be written (read-only filesystem or /tmp error):", writeErr.message);
        }
      }

      try {
        const regData = await fs.readFile(LOCAL_DB_PATH, "utf-8");
        const registrations = JSON.parse(regData);
        registrationCount = registrations.length;
      } catch (err) {
        registrationCount = 0;
      }
    }

    return NextResponse.json({
      success: true,
      config,
      registrationCount
    });

  } catch (error) {
    console.error("[API CONFIG ERROR] GET dynamic config error:", error);
    return NextResponse.json(
      { error: "Failed to load site configuration." },
      { status: 500 }
    );
  }
}

// POST Save Dynamic Configuration (Admin Only)
export async function POST(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { eventTitle, eventDate, registrationLimit, isRegistrationEnabled, registrationClosedMessage, speakers, schedule } = body;

    // Build update object with exact validation
    const updatedConfig = {
      eventTitle: eventTitle ? eventTitle.trim() : DEFAULT_CONFIG.eventTitle,
      eventDate: eventDate ? eventDate.trim() : DEFAULT_CONFIG.eventDate,
      registrationLimit: Number(registrationLimit) || 100,
      isRegistrationEnabled: isRegistrationEnabled ?? true,
      registrationClosedMessage: registrationClosedMessage ? registrationClosedMessage.trim() : DEFAULT_CONFIG.registrationClosedMessage,
      speakers: Array.isArray(speakers) ? speakers : [],
      schedule: Array.isArray(schedule) ? schedule : []
    };

    // --- SAVE: Firebase Firestore ---
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const admin = getFirebaseAdmin();
      const db = admin.firestore();
      await db.collection("config").doc("landingPage").set(updatedConfig);
      console.log("[DATABASE] Firebase Config updated by Admin");
    }

    // --- SAVE: PostgreSQL / Supabase ---
    else if (process.env.DATABASE_URL) {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await pool.query(
        "INSERT INTO configurations (key, value) VALUES ('landingPage', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [JSON.stringify(updatedConfig)]
      );
      await pool.end();
      console.log("[DATABASE] PostgreSQL Config updated by Admin");
    }

    // --- SAVE: Local JSON Fallback ---
    else {
      try {
        await fs.writeFile(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2), "utf-8");
        console.log("[DATABASE] Local config JSON updated by Admin");
      } catch (writeErr) {
        console.error("[DATABASE ERROR] Failed to write local config JSON:", writeErr);
        return NextResponse.json(
          { error: `Failed to persist configuration locally: ${writeErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Configuration successfully saved.",
      config: updatedConfig
    });

  } catch (error) {
    console.error("[API CONFIG ERROR] POST dynamic config error:", error);
    return NextResponse.json(
      { error: "Failed to update configuration." },
      { status: 500 }
    );
  }
}
