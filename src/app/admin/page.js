"use client";

import { useState, useEffect, useRef } from "react";

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tab: 'registrations', 'scanner', 'settings', 'speakers', 'schedule'
  const [activeTab, setActiveTab] = useState("registrations");

  // Live registrations & dynamic config state
  const [registrations, setRegistrations] = useState([]);
  const [config, setConfig] = useState(null);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");

  // Dynamic Custom Focus Tracks Editor States
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackSlug, setNewTrackSlug] = useState("");

  // Camera QR scanner state
  const [scannerScriptLoaded, setScannerScriptLoaded] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState(null);
  const [scannerError, setScannerError] = useState("");
  const qrScannerRef = useRef(null);

  // CRUD Editing States
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [speakerImageUrl, setSpeakerImageUrl] = useState("");
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deletingParticipant, setDeletingParticipant] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Success Feedback Toast
  const [toastMessage, setToastMessage] = useState(null);

  // Theme support
  const [darkMode, setDarkMode] = useState(false);

  // Dynamic customized focus tracks mapping or fallbacks
  const focusTracks = config?.focusTracks || [
    { id: "video", name: "Video Production" },
    { id: "audio", name: "Audio & Sound" },
    { id: "design", name: "Graphic Design" },
    { id: "social", name: "Social Media" },
    { id: "content", name: "Content Strategy" }
  ];

  // Instantly update the custom focus tracks in local state
  const handleUpdateFocusTracksState = (updatedTracks) => {
    setConfig((prev) => ({
      ...prev,
      focusTracks: updatedTracks,
    }));
  };

  // Client-side HTML5 Canvas Image Resizer & Compressor (limits headshot sizes to ~15KB - 30KB JPEGs)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const max_size = 300;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => resolve(file);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Load scanner library CDN dynamically, synchronize theme preference, and load authorization state
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.onload = () => setScannerScriptLoaded(true);
    document.body.appendChild(script);

    // Sync light/dark theme preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    // Read stored session authorization
    const storedPass = sessionStorage.getItem("admin_pass");
    if (storedPass) {
      setAdminPassword(storedPass);
      validateSavedPassword(storedPass);
    } else {
      setIsLoading(false);
    }

    return () => {
      document.body.removeChild(script);
      stopScanner();
    };
  }, []);

  // Sync edit image state
  useEffect(() => {
    if (editingSpeaker) {
      setSpeakerImageUrl(editingSpeaker.image || "");
    } else {
      setSpeakerImageUrl("");
    }
  }, [editingSpeaker]);

  const handleImageUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Only image files are allowed!", "error");
      return;
    }

    setUploadingImage(true);
    showToast("Compressing image...");

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminPassword}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSpeakerImageUrl(data.url);
        showToast("Image compressed and uploaded successfully!");
      } else {
        showToast(data.error || "Failed to upload image.", "error");
      }
    } catch (err) {
      showToast("Failed to process or upload image.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleTheme = () => {
    if (darkMode) {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // Show dynamic toast helper
  const showToast = (message, type = "success") => {
    setToastMessage({ text: message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Dual-tone high-tech synthesized scan audio confirmation
  const playSuccessChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error("Synthetic audio beep failed:", e);
    }
  };

  // Fetch full data set from APIs
  const fetchDashboardData = async (password = adminPassword) => {
    setIsLoading(true);
    try {
      // 1. Fetch Config
      const configRes = await fetch("/api/config");
      const configData = await configRes.json();
      if (configData.success) {
        setConfig(configData.config);
        setRegistrationCount(configData.registrationCount);
      }

      // 2. Fetch Registrations
      const regRes = await fetch("/api/admin/registrations", {
        headers: { Authorization: `Bearer ${password}` },
      });
      const regData = await regRes.json();

      if (regRes.ok && regData.success) {
        setRegistrations(regData.registrations);
        setAuthorized(true);
        sessionStorage.setItem("admin_pass", password);
      } else {
        setLoginError(regData.error || "Authorization declined.");
        setAuthorized(false);
        sessionStorage.removeItem("admin_pass");
      }
    } catch (err) {
      setLoginError("Could not connect to secure endpoints.");
      setAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = e => {
    e.preventDefault();
    setLoginError("");
    if (!adminPassword.trim()) {
      setLoginError("Passphrase key is required.");
      return;
    }
    setLoginLoading(true);
    fetchDashboardData(adminPassword.trim()).then(() => setLoginLoading(false));
  };

  const validateSavedPassword = savedPass => {
    fetchDashboardData(savedPass);
  };

  // Toggle check-in status of attendee
  const handleCheckInToggle = async (attendeeId, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({ id: attendeeId, checkedIn: nextStatus }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Local state update
        setRegistrations(prev =>
          prev.map(reg => {
            if (reg.id === attendeeId) {
              return { ...reg, checkedIn: nextStatus, checkedInAt: nextStatus ? new Date().toISOString() : null };
            }
            return reg;
          }),
        );
        playSuccessChime();
        showToast(nextStatus ? "Attendee checked-in successfully!" : "Check-in reverted successfully.");
        return true;
      } else {
        showToast(data.error || "Update failed.", "error");
        return false;
      }
    } catch (err) {
      showToast("Network failed to record attendance.", "error");
      return false;
    }
  };

  // Delete attendee participant registration
  const handleDeleteParticipant = async () => {
    if (!deletingParticipant) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations?id=${deletingParticipant.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminPassword}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRegistrations(prev => prev.filter(r => r.id !== deletingParticipant.id));
        showToast("Participant record deleted successfully.");
        setDeletingParticipant(null);
      } else {
        showToast(data.error || "Failed to delete participant.", "error");
      }
    } catch (err) {
      showToast("Network failed to delete participant.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // General Settings update
  const handleSaveSettings = async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      ...config,
      eventTitle: formData.get("eventTitle"),
      eventDate: formData.get("eventDate"),
      registrationLimit: Number(formData.get("registrationLimit")),
      isRegistrationEnabled: formData.get("isRegistrationEnabled") === "true",
      registrationClosedMessage: formData.get("registrationClosedMessage"),
    };

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        showToast("Event general configurations saved!");
      } else {
        showToast(data.error || "Failed to save settings.", "error");
      }
    } catch (err) {
      showToast("Network failure. Try again.", "error");
    }
  };

  // Speakers dynamic manager
  const handleSaveSpeaker = async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const spId = editingSpeaker.id || `sp_${Date.now()}`;
    const newSp = {
      id: spId,
      name: formData.get("name"),
      role: formData.get("role"),
      bio: formData.get("bio"),
      focus: formData.get("focus"),
      session: formData.get("session"),
      image: speakerImageUrl || null,
    };

    let updatedSpeakers = [...config.speakers];
    if (editingSpeaker.id) {
      updatedSpeakers = updatedSpeakers.map(s => (s.id === spId ? newSp : s));
    } else {
      updatedSpeakers.push(newSp);
    }

    const payload = { ...config, speakers: updatedSpeakers };
    await pushConfigUpdate(payload, "Speaker records updated successfully!");
    setEditingSpeaker(null);
  };

  const handleDeleteSpeaker = async spId => {
    if (!confirm("Are you sure you want to remove this speaker?")) return;
    const updatedSpeakers = config.speakers.filter(s => s.id !== spId);
    const payload = { ...config, speakers: updatedSpeakers };
    await pushConfigUpdate(payload, "Speaker removed successfully.");
  };

  // Program Timeline dynamic manager
  const handleSaveTimeline = async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const evId = editingSchedule.id || `evt_${Date.now()}`;

    // Parse complex tracks JSON safely if present
    let tracks = null;
    const tracksStr = formData.get("tracksJson");
    if (tracksStr && tracksStr.trim()) {
      try {
        tracks = JSON.parse(tracksStr);
      } catch (err) {
        alert(
          'Tracks JSON must be a valid JSON array or blank! Format: [{"name":"TrackName","title":"Title","speakers":"Mentor"}]',
        );
        return;
      }
    }

    const newEv = {
      id: evId,
      time: formData.get("time"),
      title: formData.get("title"),
      category: formData.get("category"),
      period: formData.get("period"),
      speaker: formData.get("speaker") || null,
      description: formData.get("description"),
      ...(tracks && { tracks }),
    };

    let updatedSchedule = [...config.schedule];
    if (editingSchedule.id) {
      updatedSchedule = updatedSchedule.map(ev => (ev.id === evId ? newEv : ev));
    } else {
      updatedSchedule.push(newEv);
    }

    const payload = { ...config, schedule: updatedSchedule };
    await pushConfigUpdate(payload, "Schedule timetable updated!");
    setEditingSchedule(null);
  };

  const handleDeleteTimeline = async evId => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    const updatedSchedule = config.schedule.filter(ev => ev.id !== evId);
    const payload = { ...config, schedule: updatedSchedule };
    await pushConfigUpdate(payload, "Session deleted successfully.");
  };

  // Helper to push config updates to database
  const pushConfigUpdate = async (updatedPayload, successMsg) => {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify(updatedPayload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        showToast(successMsg);
      } else {
        showToast(data.error || "Save configuration failed.", "error");
      }
    } catch (err) {
      showToast("Network sync failed.", "error");
    }
  };

  // Dynamic Browser-based camera scanner handlers
  const startScanner = () => {
    if (!scannerScriptLoaded) {
      setScannerError("Camera QR libraries still loading...");
      return;
    }
    setScannerActive(true);
    setScannerError("");
    setLastScannedResult(null);

    setTimeout(() => {
      try {
        const html5QrcodeScanner = new Html5Qrcode("qr-reader");
        qrScannerRef.current = html5QrcodeScanner;

        html5QrcodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: { width: 250, height: 250 },
          },
          async decodedText => {
            // Success scan handle
            const cleanId = decodedText.trim();
            const attendee = registrations.find(r => r.id === cleanId);

            if (attendee) {
              if (attendee.checkedIn) {
                setLastScannedResult({
                  attendee,
                  status: "already",
                  message: "Already Checked In!",
                });
                playSuccessChime();
              } else {
                const didSucceed = await handleCheckInToggle(cleanId, false);
                if (didSucceed) {
                  setLastScannedResult({
                    attendee: { ...attendee, checkedIn: true },
                    status: "success",
                    message: "Checked In Successfully!",
                  });
                }
              }
            } else {
              setLastScannedResult({
                id: cleanId,
                status: "invalid",
                message: "Ticket Not Found in Database!",
              });
            }
            // Temporarily pause scanner to show visual feedback card
            stopScanner();
          },
          errorMessage => {
            // Quiet debug errors
          },
        );
      } catch (err) {
        setScannerError("Could not access camera or start feed.");
        setScannerActive(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current
          .stop()
          .then(() => {
            qrScannerRef.current = null;
          })
          .catch(() => {});
      } catch (e) {}
    }
    setScannerActive(false);
  };

  // Export registrations directory sheets to offline CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) {
      alert("No registered data available to export.");
      return;
    }

    const headers = [
      "Registration ID",
      "Full Name",
      "Email Address",
      "Phone Number",
      "Focus Track",
      "Church Affiliation",
      "Registration Date",
      "Checked In",
      "Checked In Time",
    ];
    const rows = registrations.map(r => [
      r.id,
      r.fullName,
      r.email,
      r.phone || "",
      r.focus,
      r.church || "",
      r.registeredAt,
      r.checkedIn ? "YES" : "NO",
      r.checkedInAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Creative_Create_Registrations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter lists based on states
  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrack = trackFilter === "all" || r.focus === trackFilter;
    return matchesSearch && matchesTrack;
  });

  // Calculate live counters dynamically based on current focus tracks
  const totalSpots = config?.registrationLimit || 100;
  const countCheckedIn = registrations.filter(r => r.checkedIn).length;
  const trackCounts = focusTracks.reduce((acc, track) => {
    acc[track.id] = registrations.filter(r => r.focus === track.id).length;
    return acc;
  }, {});
  const checkinPercentage = registrations.length > 0 ? ((countCheckedIn / registrations.length) * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-primary border-primary-container rounded-full animate-spin"></div>
          <span className="font-sora text-sm font-semibold tracking-wider text-outline uppercase animate-pulse">
            Decrypting Security Terminal...
          </span>
        </div>
      </div>
    );
  }

  // --- RENDERING SECURITY ENTRANCE PORTAL ---
  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground relative overflow-hidden transition-colors duration-300">
        {/* Dynamic neon halo design grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full filter blur-[120px] opacity-20"></div>

        <form
          onSubmit={handleLoginSubmit}
          className="glass-panel w-full max-w-md rounded-3xl p-8 border border-outline-variant/30 shadow-2xl relative space-y-6 text-center select-none"
        >
          <div className="w-20 h-20 rounded-2xl shrink-0 flex items-center justify-center mx-auto bg-surface-container border border-outline-variant/20 overflow-hidden shadow-lg select-none">
            <img src="/logo.png" alt="Kingdom Creatives Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <h1 className="font-sora text-2xl font-black tracking-tight">Security Access Required</h1>
            <p className="font-hanken text-xs text-foreground/70 mt-1.5 leading-relaxed">
              Entrance key challenge. Please enter your administrator passphrase to verify credentials.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-error-container/20 border border-error text-error rounded-xl text-xs font-bold flex items-center space-x-2 text-left">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{loginError}</span>
            </div>
          )}

          <div className="flex flex-col space-y-2 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground/80" htmlFor="adminPassword">
              ADMINISTRATOR PASSPHRASE
            </label>
            <input
              type="password"
              id="adminPassword"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              className="input-focus w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3.5 text-sm outline-none text-foreground focus:border-primary font-mono tracking-widest text-center"
              placeholder="••••••••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-primary text-background hover:bg-primary-hover font-bold py-4 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-75"
          >
            {loginLoading ? (
              <div className="w-5 h-5 border-2 border-t-background border-outline rounded-full animate-spin"></div>
            ) : (
              <span>Authorize Entrance</span>
            )}
          </button>
        </form>
      </div>
    );
  }

  // --- RENDERING SECURE ADMINISTRATIVE TERMINAL ---
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative w-full transition-colors duration-300">
      {/* SUCCESS TOAST ALERT PANEL */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[120] p-4 rounded-2xl shadow-2xl border flex items-center space-x-2 text-sm font-bold animate-slide-in select-none ${toastMessage.type === "error" ? "bg-error-container/20 border-error text-error" : "bg-primary/10 border-primary text-primary"}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ADMIN CONTROL PANEL HEADER */}
      <header className="glass-panel border-b border-outline-variant/10 py-4 px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 select-none">
        <div className="flex flex-col">
          <div className="relative h-10 overflow-hidden shrink-0">
            <img src="/logo.png" alt="Kingdom Creatives Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            {/* <h1 className="font-sora text-sm font-black tracking-tight flex items-center gap-2">
              Admin
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                Live
              </span>
            </h1> */}
            <p className="font-hanken text-[10px] text-outline">Decrypt Command Center</p>
          </div>
        </div>

        {/* Global tab options */}
        <div className="flex flex-wrap bg-surface-container-high/40 border border-outline-variant/30 rounded-2xl p-1 gap-1">
          {[
            { id: "registrations", label: "Registrations", icon: "🎫" },
            { id: "scanner", label: "QR Scanner", icon: "📷" },
            { id: "speakers", label: "Speakers", icon: "🎙️" },
            { id: "schedule", label: "Program", icon: "📅" },
            { id: "settings", label: "Settings", icon: "⚙️" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                stopScanner();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all focus:outline-none ${activeTab === tab.id ? "bg-primary text-background shadow-lg" : "text-foreground/70 hover:text-foreground hover:bg-surface-container-high/20"}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 select-none">
          {/* Dark/Light mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full text-foreground/80 hover:text-primary hover:bg-surface-container-high transition-colors focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30 bg-surface-container-low"
            aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 9.9a5 5 0 117.07 0l2.828-9.9z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem("admin_pass");
              setAuthorized(false);
            }}
            className="text-xs font-semibold border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 py-2.5 px-4 rounded-xl transition-all"
          >
            Exit Panel
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE SCREEN */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-10 select-text max-w-7xl mx-auto w-full space-y-8">
        {/* Dynamic Analytics Counters Widget */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 select-none">
          <div className="glass-panel p-5 rounded-2xl border border-outline-variant/30 text-left relative overflow-hidden shadow">
            <div className="absolute top-0 right-0 w-12 h-12 bg-primary rounded-full filter blur-[35px] opacity-25"></div>
            <span className="text-[10px] text-outline font-black uppercase tracking-wider block">Registrations</span>
            <span className="font-sora text-3xl font-black text-foreground mt-1 block">{registrations.length}</span>
            <span className="text-[10px] text-foreground/70 block mt-2">
              Cap threshold: {totalSpots} ({((registrations.length / totalSpots) * 100).toFixed(0)}%)
            </span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-outline-variant/30 text-left relative overflow-hidden shadow">
            <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500 rounded-full filter blur-[35px] opacity-25"></div>
            <span className="text-[10px] text-outline font-black uppercase tracking-wider block">Checked In</span>
            <span className="font-sora text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {countCheckedIn}
            </span>
            <span className="text-[10px] text-foreground/70 block mt-2">Arrival Rate: {checkinPercentage}%</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-outline-variant/30 text-left relative overflow-hidden shadow">
            <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500 rounded-full filter blur-[35px] opacity-25"></div>
            <span className="text-[10px] text-outline font-black uppercase tracking-wider block">Media Tracks</span>
            <span className="font-sora text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1 block">
              {focusTracks.length}
            </span>
            <span className="text-[10px] text-foreground/70 block mt-2 truncate">
              {focusTracks.slice(0, 3).map(t => `${t.name.split(" ")[0]}: ${trackCounts[t.id] || 0}`).join(" | ")}
              {focusTracks.length > 3 ? "..." : ""}
            </span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-outline-variant/30 text-left relative overflow-hidden shadow">
            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500 rounded-full filter blur-[35px] opacity-25"></div>
            <span className="text-[10px] text-outline font-black uppercase tracking-wider block">
              Registration State
            </span>
            <span
              className={`font-sora text-xl font-black mt-2 block ${config?.isRegistrationEnabled ? "text-primary" : "text-rose-600 dark:text-rose-400"}`}
            >
              {config?.isRegistrationEnabled ? "🔓 ACCEPTING" : "🔒 CLOSED"}
            </span>
            <span className="text-[10px] text-foreground/70 block mt-2">
              Limit full check: {registrations.length >= totalSpots ? "FULL" : "OPEN"}
            </span>
          </div>
        </div>

        {/* --- TAB VIEW 1: REGISTRATIONS MANAGEMENT DIRECTORY --- */}
        {activeTab === "registrations" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 select-none">
              <div className="flex items-center space-x-3 w-full md:max-w-md">
                {/* Searching Lookup input */}
                <input
                  type="text"
                  placeholder="Instant gate search by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-focus w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs outline-none text-foreground focus:border-primary placeholder-outline"
                />

                {/* Track select selector */}
                <select
                  value={trackFilter}
                  onChange={e => setTrackFilter(e.target.value)}
                  className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-3 py-3 text-xs outline-none text-foreground focus:border-primary font-semibold"
                >
                  <option value="all" className="bg-surface-container text-foreground">
                    All Tracks
                  </option>
                  {focusTracks.map(track => (
                    <option key={track.id} value={track.id} className="bg-surface-container text-foreground">
                      {track.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto shrink-0 justify-end">
                <button
                  onClick={handleExportCSV}
                  className="bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high font-bold text-xs py-3 px-5 rounded-2xl flex items-center gap-1.5 transition-all text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Export CSV Sheets</span>
                </button>
                <button
                  onClick={() => fetchDashboardData()}
                  className="bg-primary/10 border border-primary/20 hover:bg-primary/20 font-bold text-xs py-3 px-5 rounded-2xl flex items-center gap-1.5 transition-all text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Registrations List Dynamic Table */}
            <div className="glass-panel border border-outline-variant/30 rounded-3xl overflow-hidden shadow-lg select-text">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant/20 text-outline font-black uppercase tracking-wider text-[10px] select-none">
                      <th className="py-4 px-6">Participant</th>
                      <th className="py-4 px-6">Focus Track</th>
                      <th className="py-4 px-6">Church / Affiliation</th>
                      <th className="py-4 px-6">Registered At</th>
                      <th className="py-4 px-6 text-center">Gate Arrival Check-In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-outline font-semibold select-none">
                          No matching registrants found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map(row => (
                        <tr
                          key={row.id}
                          className="border-b border-outline-variant/15 hover:bg-surface-container/30 transition-colors"
                        >
                          <td className="py-4.5 px-6">
                            <div className="font-bold text-foreground text-sm">{row.fullName}</div>
                            <div className="text-foreground/75 font-medium mt-0.5">{row.email}</div>
                            {row.phone && <div className="text-outline font-mono text-[11px] mt-0.5">{row.phone}</div>}
                          </td>
                          <td className="py-4.5 px-6 capitalize">
                            <span className="inline-flex px-2 py-0.5 text-[9px] font-black rounded-md bg-primary/5 text-primary border border-primary/20">
                              {row.focus}
                            </span>
                          </td>
                          <td className="py-4.5 px-6 font-semibold text-foreground/85 truncate max-w-[150px]">
                            {row.church || <span className="text-outline/50 italic">None</span>}
                          </td>
                          <td className="py-4.5 px-6 text-foreground/75 font-semibold select-none">
                            {new Date(row.registeredAt).toLocaleDateString()} at{" "}
                            {new Date(row.registeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-4.5 px-6 select-none">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleCheckInToggle(row.id, row.checkedIn)}
                                className={`font-black text-[10px] py-2 px-4 rounded-xl transition-all focus:outline-none tracking-wider uppercase flex items-center justify-center space-x-1.5 ${row.checkedIn ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-glow" : "bg-surface-container border border-outline-variant/30 text-foreground/70 hover:bg-surface-container-high"}`}
                              >
                                {row.checkedIn ? (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    <span>Arrived</span>
                                  </>
                                ) : (
                                  <span>Check In</span>
                                )}
                              </button>

                              <button
                                onClick={() => setDeletingParticipant(row)}
                                className="p-2 border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all focus:outline-none"
                                title="Delete Participant"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                            {row.checkedInAt && (
                              <span className="text-[9px] text-outline/65 font-medium block mt-1 text-center">
                                Checked in at:{" "}
                                {new Date(row.checkedInAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB VIEW 2: CAMERA QR CODE GATE SCANNER TERMINAL --- */}
        {activeTab === "scanner" && (
          <div className="max-w-xl mx-auto space-y-6 select-none">
            <div className="text-center">
              <h2 className="font-sora text-xl font-extrabold flex items-center justify-center gap-2">
                📷 Web Camera QR Entry Gate
              </h2>
              <p className="font-hanken text-xs text-foreground/75 mt-1 max-w-sm mx-auto">
                Scan attendee digital entry ticket QR codes via the local device camera to authenticate registrations in
                under 1 second.
              </p>
            </div>

            {/* Live Camera Feed Container */}
            <div className="glass-panel border border-outline-variant/30 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center justify-center space-y-4">
              {scannerActive ? (
                <div className="w-full relative rounded-2xl overflow-hidden bg-black/60 aspect-square max-w-sm border-2 border-primary/30">
                  <div id="qr-reader" className="w-full h-full"></div>
                  {/* Glowing camera scanning indicator box overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-dashed border-primary rounded-xl animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square max-w-sm rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center justify-center space-y-3 relative text-center px-4">
                  <svg className="w-12 h-12 text-outline/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 9.9a5 5 0 117.07 0l2.828-9.9z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Gate Camera Closed</h3>
                    <p className="text-[10px] text-outline mt-1">
                      Activate the scanner gate feed to start scanning digital passes.
                    </p>
                  </div>
                </div>
              )}

              {scannerError && <p className="text-xs font-bold text-rose-500 mt-2">{scannerError}</p>}

              <div className="flex space-x-3 w-full max-w-sm pt-4">
                {scannerActive ? (
                  <button
                    onClick={stopScanner}
                    className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold py-3.5 rounded-2xl text-xs transition-all focus:outline-none"
                  >
                    Close Scanner Feed
                  </button>
                ) : (
                  <button
                    onClick={startScanner}
                    className="w-full bg-primary text-background hover:bg-primary-hover font-bold py-3.5 rounded-2xl text-xs transition-all shadow focus:outline-none"
                  >
                    Launch Camera Scanner
                  </button>
                )}
              </div>
            </div>

            {/* DYNAMIC SCANNED VISUAL VERIFICATION DETAILS CARD */}
            {lastScannedResult && (
              <div
                className={`p-6 rounded-3xl border shadow-glow animate-scale-up text-left space-y-4 ${
                  lastScannedResult.status === "success"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : lastScannedResult.status === "already"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black tracking-widest uppercase py-0.5 px-2 rounded-md bg-surface-container-low border border-outline-variant/30 select-none">
                      SCAN RESULT VERIFICATION
                    </span>
                    <h3 className="font-sora text-lg font-extrabold mt-2 leading-none flex items-center gap-1.5">
                      {lastScannedResult.status === "success"
                        ? "🟢"
                        : lastScannedResult.status === "already"
                          ? "🟡"
                          : "🔴"}
                      {lastScannedResult.message}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setLastScannedResult(null);
                      startScanner();
                    }}
                    className="bg-surface-container-low border border-outline-variant/30 text-foreground hover:bg-surface-container-high text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all focus:outline-none select-none"
                  >
                    Resume Scanner
                  </button>
                </div>

                {lastScannedResult.attendee && (
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-outline-variant/20 pt-4">
                    <div>
                      <span className="text-[9px] text-outline font-black block select-none">ATTENDEE NAME</span>
                      <span className="font-bold text-foreground text-sm">{lastScannedResult.attendee.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-outline font-black block select-none">EMAIL</span>
                      <span className="font-semibold text-foreground/85 truncate block">
                        {lastScannedResult.attendee.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-outline font-black block select-none">MEDIA TRACK</span>
                      <span className="font-bold text-foreground capitalize">{lastScannedResult.attendee.focus}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-outline font-black block select-none">CHURCH AFFILIATION</span>
                      <span className="font-bold text-foreground truncate block">
                        {lastScannedResult.attendee.church || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                {lastScannedResult.id && (
                  <div className="text-xs border-t border-outline-variant/20 pt-4">
                    <span className="text-[9px] text-outline font-black block select-none">SCANNED UNKNOWN ID</span>
                    <span className="font-mono text-foreground/80 block break-all">{lastScannedResult.id}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- TAB VIEW 3: SPEAKERS DIRECTORY LIST & CRUD CREATOR --- */}
        {activeTab === "speakers" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center select-none">
              <div>
                <h2 className="font-sora text-xl font-extrabold">🎙️ Guest Speakers Hub</h2>
                <p className="font-hanken text-xs text-foreground/75 mt-1">
                  Add, edit, or configure speaker sessions and biographical layouts instantly on the home page.
                </p>
              </div>
              <button
                onClick={() => setEditingSpeaker({ name: "", role: "", bio: "", focus: "", session: "", image: "" })}
                className="bg-primary text-background hover:bg-primary-hover font-bold text-xs py-3.5 px-5 rounded-2xl shadow transition-all focus:outline-none"
              >
                Add Guest Speaker
              </button>
            </div>

            {/* List Speakers Card dynamic editor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text">
              {config?.speakers.map(sp => (
                <div
                  key={sp.id}
                  className="glass-panel p-6 border border-outline-variant/20 rounded-3xl flex justify-between items-start gap-4 relative overflow-hidden group shadow-sm hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black shrink-0 border border-primary/20 select-none overflow-hidden">
                        {sp.image ? (
                          <img src={sp.image} alt={sp.name} className="w-full h-full object-cover" />
                        ) : (
                          sp.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-sora font-extrabold text-foreground text-base">{sp.name}</h3>
                        <p className="font-hanken text-xs text-foreground/60 font-semibold">{sp.role}</p>
                      </div>
                    </div>
                    <p className="font-hanken text-xs text-foreground/80 leading-relaxed font-semibold line-clamp-3">
                      {sp.bio}
                    </p>
                    <div className="text-[11px] font-bold">
                      <span className="text-primary block font-mono text-[9px] uppercase tracking-wider select-none">
                        Session Details
                      </span>
                      <span className="text-foreground/80">{sp.session || "N/A"}</span>
                    </div>
                    {sp.focus && (
                      <span className="inline-flex px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-primary/5 border border-primary/15 text-primary select-none">
                        {sp.focus}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 select-none">
                    <button
                      onClick={() => setEditingSpeaker(sp)}
                      className="bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high text-foreground/80 text-[10px] font-bold py-2 px-3 rounded-xl transition-all focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSpeaker(sp.id)}
                      className="border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold py-2 px-3 rounded-xl transition-all focus:outline-none"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* SPEAKER CREATOR/EDITOR MODAL */}
            {editingSpeaker && (
              <div
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm select-none"
                onClick={() => setEditingSpeaker(null)}
              >
                <div
                  className="glass-panel w-full max-w-2xl rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-2xl relative space-y-6 text-left animate-scale-up"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="font-sora text-lg font-black text-foreground">
                    {editingSpeaker.id ? "🎙️ Edit Speaker Profile" : "🎙️ Create Speaker Profile"}
                  </h3>

                  <form onSubmit={handleSaveSpeaker} className="space-y-6 text-xs font-semibold">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Speaker Identity & Presentation details */}
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                          <label htmlFor="name" className="text-outline font-bold">
                            FULL NAME
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            defaultValue={editingSpeaker.name}
                            className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold"
                            required
                          />
                        </div>
                        <div className="flex flex-col space-y-2">
                          <label htmlFor="role" className="text-outline font-bold">
                            ROLE / DISCIPLINE
                          </label>
                          <input
                            type="text"
                            id="role"
                            name="role"
                            defaultValue={editingSpeaker.role}
                            className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold"
                            required
                          />
                        </div>
                        <div className="flex flex-col space-y-2">
                          <label htmlFor="focus" className="text-outline font-bold">
                            MEDIA FOCUS TRACK
                          </label>
                          <select
                            id="focus"
                            name="focus"
                            defaultValue={editingSpeaker.focus}
                            className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-bold"
                            required
                          >
                            {focusTracks.map(track => (
                              <option key={track.id} value={track.id} className="bg-surface-container text-foreground">
                                {track.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <label htmlFor="session" className="text-outline font-bold">
                            SESSION TITLE
                          </label>
                          <input
                            type="text"
                            id="session"
                            name="session"
                            defaultValue={editingSpeaker.session}
                            className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold"
                            required
                          />
                        </div>
                      </div>

                      {/* Right Column: Visual Uploader & Biography */}
                      <div className="space-y-4 flex flex-col justify-between">
                        <div className="flex flex-col space-y-2">
                          <span className="text-outline font-bold uppercase tracking-wider text-[10px]">
                            Speaker Photo
                          </span>

                          {speakerImageUrl ? (
                            <div className="relative flex items-center gap-4 p-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low shadow-sm">
                              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0">
                                <img
                                  src={speakerImageUrl}
                                  alt="Speaker preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-foreground truncate">
                                  {speakerImageUrl.split("/").pop()}
                                </p>
                                <p className="text-[9px] text-primary font-semibold mt-0.5">Uploaded & Ready</p>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <div className="relative overflow-hidden">
                                  <button
                                    type="button"
                                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-black px-3 py-1.5 rounded-lg transition-all text-center w-full"
                                  >
                                    Replace
                                  </button>
                                  <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={uploadingImage}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSpeakerImageUrl("")}
                                  className="border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 hover:border-primary/50 bg-surface-container-low rounded-2xl p-6 text-center transition-colors cursor-pointer select-none">
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                onChange={handleImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploadingImage}
                              />

                              {uploadingImage ? (
                                <div className="flex flex-col items-center space-y-3">
                                  <div className="w-8 h-8 border-3 border-t-primary border-outline-variant/40 rounded-full animate-spin"></div>
                                  <span className="text-[11px] font-bold text-outline animate-pulse">
                                    Uploading file to server...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center space-y-2">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2.5"
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      ></path>
                                    </svg>
                                  </div>
                                  <div className="text-[11px] font-bold text-foreground">Upload Speaker Photo</div>
                                  <div className="text-[9px] text-outline font-semibold">
                                    PNG, JPG, WEBP or GIF (max 5MB)
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2 flex-1">
                          <label htmlFor="bio" className="text-outline font-bold">
                            BIOGRAPHY PROFILE
                          </label>
                          <textarea
                            id="bio"
                            name="bio"
                            defaultValue={editingSpeaker.bio}
                            placeholder="Write a brief professional bio..."
                            className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold leading-relaxed flex-1 min-h-[96px] md:min-h-[140px] resize-none"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-outline-variant/10 flex justify-end space-x-3 select-none">
                      <button
                        type="button"
                        onClick={() => setEditingSpeaker(null)}
                        className="bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high font-bold py-3 px-6 rounded-xl transition-all text-foreground text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-primary text-background hover:bg-primary-hover font-bold py-3 px-8 rounded-xl transition-all text-xs shadow-md"
                      >
                        Save Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB VIEW 4: SCHEDULE / TIMETABLE BUILDER DIRECTORY --- */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center select-none">
              <div>
                <h2 className="font-sora text-xl font-extrabold text-foreground">📅 Timetable & Schedule Builder</h2>
                <p className="font-hanken text-xs text-foreground/75 mt-1">
                  Structure, edit, and organize conference timeslots, categories, workshops, and hosts dynamically.
                </p>
              </div>
              <button
                onClick={() =>
                  setEditingSchedule({
                    time: "",
                    title: "",
                    category: "general",
                    period: "morning",
                    speaker: "",
                    description: "",
                  })
                }
                className="bg-primary text-background hover:bg-primary-hover font-bold text-xs py-3.5 px-5 rounded-2xl shadow transition-all focus:outline-none"
              >
                Add Session timeslot
              </button>
            </div>

            {/* Timetable schedule dynamic editor list */}
            <div className="space-y-4 select-text">
              {config?.schedule.map((ev, idx) => (
                <div
                  key={ev.id || idx}
                  className="glass-panel p-6 border border-outline-variant/20 rounded-3xl flex justify-between items-start gap-4 relative overflow-hidden group shadow-sm hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-sora text-sm font-black text-primary block leading-none">{ev.time}</span>
                      <span className="inline-flex px-2 py-0.5 text-[8px] font-black uppercase rounded bg-surface-container-low border border-outline-variant/30 text-foreground/75 select-none">
                        {ev.category} • {ev.period}
                      </span>
                    </div>
                    <h3 className="font-sora font-extrabold text-foreground text-base mt-1">{ev.title}</h3>
                    {ev.speaker && (
                      <p className="text-xs font-bold text-secondary select-none font-sans">
                        Mentor/Host: {ev.speaker}
                      </p>
                    )}
                    <p className="font-hanken text-xs text-foreground/80 leading-relaxed font-semibold">
                      {ev.description}
                    </p>

                    {ev.tracks && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-outline-variant/20 select-text">
                        {ev.tracks.map((t, tIdx) => (
                          <div
                            key={tIdx}
                            className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20"
                          >
                            <h4 className="text-[9px] font-black text-primary uppercase tracking-wide">{t.name}</h4>
                            <p className="font-bold text-foreground text-xs mt-1 leading-snug">{t.title}</p>
                            <p className="text-[10px] text-foreground/60 font-semibold mt-0.5">Mentor: {t.speakers}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 shrink-0 select-none">
                    <button
                      onClick={() => setEditingSchedule(ev)}
                      className="bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high text-foreground/80 text-[10px] font-bold py-2 px-3 rounded-xl transition-all focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTimeline(ev.id)}
                      className="border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold py-2 px-3 rounded-xl transition-all focus:outline-none"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* TIMETABLE DYNAMIC EDITOR MODAL */}
            {editingSchedule && (
              <div
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm select-none"
                onClick={() => setEditingSchedule(null)}
              >
                <div
                  className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-2xl relative space-y-4 text-left animate-scale-up"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="font-sora text-lg font-black text-foreground">
                    {editingSchedule.id ? "📅 Edit Timetable Session" : "📅 Create Timetable Session"}
                  </h3>

                  <form onSubmit={handleSaveTimeline} className="space-y-4 text-xs font-semibold">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="time" className="text-outline font-bold">
                          TIME BLOCK
                        </label>
                        <input
                          type="text"
                          id="time"
                          name="time"
                          placeholder="e.g. 10:00 AM"
                          defaultValue={editingSchedule.time}
                          className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold"
                          required
                        />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="period" className="text-outline font-bold">
                          DAY SECTION
                        </label>
                        <select
                          id="period"
                          name="period"
                          defaultValue={editingSchedule.period}
                          className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-bold"
                          required
                        >
                          <option value="morning" className="bg-surface-container text-foreground">
                            Morning Timetable
                          </option>
                          <option value="afternoon" className="bg-surface-container text-foreground">
                            Afternoon Timetable
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label htmlFor="title" className="text-outline font-bold">
                        SESSION TITLE
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        defaultValue={editingSchedule.title}
                        className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="category" className="text-outline font-bold">
                          CATEGORY
                        </label>
                        <select
                          id="category"
                          name="category"
                          defaultValue={editingSchedule.category}
                          className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-bold"
                          required
                        >
                          <option value="general" className="bg-surface-container text-foreground">
                            General Session
                          </option>
                          <option value="tracks" className="bg-surface-container text-foreground">
                            Workshops Tracks
                          </option>
                        </select>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="speaker" className="text-outline font-bold">
                          SPEAKER / HOST
                        </label>
                        <input
                          type="text"
                          id="speaker"
                          name="speaker"
                          placeholder="Or leave blank"
                          defaultValue={editingSchedule.speaker || ""}
                          className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label htmlFor="description" className="text-outline font-bold">
                        DESCRIPTION DETAIL
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={2}
                        defaultValue={editingSchedule.description}
                        className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-semibold leading-relaxed"
                        required
                      />
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label htmlFor="tracksJson" className="text-outline font-bold">
                        TRACK WORKSHOPS JSON (OPTIONAL)
                      </label>
                      <textarea
                        id="tracksJson"
                        name="tracksJson"
                        rows={2}
                        placeholder='[{"name":"Video Track","title":"Capture Editing","speakers":"Mentor Name"}]'
                        defaultValue={editingSchedule.tracks ? JSON.stringify(editingSchedule.tracks) : ""}
                        className="input-focus rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 outline-none text-foreground focus:border-primary text-xs font-mono font-semibold"
                      />
                      <span className="text-[10px] text-outline block mt-0.5 leading-snug">
                        Optional: Customize split track boxes inside schedule lists. Format as a valid JSON Array.
                      </span>
                    </div>

                    <div className="pt-4 flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditingSchedule(null)}
                        className="flex-1 bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high text-foreground font-bold py-3 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-primary text-background hover:bg-primary-hover font-bold py-3 rounded-xl transition-all"
                      >
                        Save timeslot
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB VIEW 5: GENERAL SETTINGS CONTROLS PANEL --- */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-6 select-none text-left">
            <div>
              <h2 className="font-sora text-xl font-extrabold text-foreground">⚙️ General Landing Settings</h2>
              <p className="font-hanken text-xs text-foreground/75 mt-1">
                Configure limits, closed statements, landing banners, and toggle interactive entry permissions in real
                time.
              </p>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-outline-variant/30 space-y-6 shadow-xl text-xs font-semibold"
            >
              <div className="flex flex-col space-y-2">
                <label htmlFor="eventTitle" className="text-outline font-bold">
                  LANDING CONFERENCE TITLE
                </label>
                <input
                  type="text"
                  id="eventTitle"
                  name="eventTitle"
                  defaultValue={config?.eventTitle}
                  className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none text-foreground focus:border-primary text-xs font-bold"
                  required
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="eventDate" className="text-outline font-bold">
                  EVENT DATE & TIMEFRAME HEADER
                </label>
                <input
                  type="text"
                  id="eventDate"
                  name="eventDate"
                  defaultValue={config?.eventDate}
                  className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none text-foreground focus:border-primary text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="registrationLimit" className="text-outline font-bold">
                    REGISTRATION CAPACITY LIMIT
                  </label>
                  <input
                    type="number"
                    id="registrationLimit"
                    name="registrationLimit"
                    defaultValue={config?.registrationLimit}
                    className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none text-foreground focus:border-primary text-xs font-bold text-center"
                    required
                  />
                  <span className="text-[10px] text-outline block mt-0.5 leading-snug">
                    Sets cap limit on registrations. Current count is: {registrationCount} / {config?.registrationLimit}
                  </span>
                </div>

                <div className="flex flex-col space-y-2">
                  <label htmlFor="isRegistrationEnabled" className="text-outline font-bold">
                    REGISTRATION STATUS MASTER SWITCH
                  </label>
                  <select
                    id="isRegistrationEnabled"
                    name="isRegistrationEnabled"
                    defaultValue={config?.isRegistrationEnabled ? "true" : "false"}
                    className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none text-foreground focus:border-primary text-xs font-bold"
                    required
                  >
                    <option value="true" className="bg-surface-container text-foreground">
                      🔓 Enabled (Allow Entries)
                    </option>
                    <option value="false" className="bg-surface-container text-foreground">
                      🔒 Disabled (Block Entries)
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="registrationClosedMessage" className="text-outline font-bold">
                  CUSTOM CLOSED / SOLD-OUT STATEMENT
                </label>
                <textarea
                  id="registrationClosedMessage"
                  name="registrationClosedMessage"
                  rows={3}
                  defaultValue={config?.registrationClosedMessage}
                  className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none text-foreground focus:border-primary text-xs font-semibold leading-relaxed"
                  required
                />
                <span className="text-[10px] text-outline block mt-0.5 leading-snug">
                  Displayed on the landing page registration form once limit is breached or disabled manually.
                </span>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-primary text-background hover:bg-primary-hover font-bold py-3.5 px-8 rounded-2xl transition-all shadow-glow"
                >
                  Save Global Configurations
                </button>
              </div>
            </form>

            {/* Custom Focus Tracks Settings */}
            <div className="pt-6">
              <h2 className="font-sora text-xl font-extrabold text-foreground">🎨 Customize Media Focus Tracks</h2>
              <p className="font-hanken text-xs text-foreground/75 mt-1">
                Dynamically add, edit, or delete the learning tracks available for registration and speaker assignments.
              </p>
            </div>

            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-outline-variant/30 space-y-6 shadow-xl text-xs font-semibold">
              {/* Existing Focus Tracks list */}
              <div className="space-y-4">
                <span className="text-[10px] text-outline font-bold uppercase tracking-wider block">
                  Active Registration Focus Tracks
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {focusTracks.map((track, idx) => (
                    <div
                      key={track.id}
                      className="flex items-center space-x-3 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/15 hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] text-outline font-bold">TRACK SLUG (ID)</label>
                          <input
                            type="text"
                            value={track.id}
                            disabled
                            className="bg-[#0c0a1a] rounded-xl border border-outline-variant/10 px-3.5 py-2 text-foreground/60 font-mono text-xs cursor-not-allowed select-all"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] text-outline font-bold">DISPLAY NAME</label>
                          <input
                            type="text"
                            value={track.name}
                            onChange={(e) => {
                              const newTracks = focusTracks.map((t, i) =>
                                i === idx ? { ...t, name: e.target.value } : t
                              );
                              handleUpdateFocusTracksState(newTracks);
                            }}
                            className="bg-surface-container rounded-xl border border-outline-variant/30 px-3.5 py-2 outline-none text-foreground focus:border-primary text-xs font-bold"
                            placeholder="e.g. Video Production"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newTracks = focusTracks.filter((_, i) => i !== idx);
                          handleUpdateFocusTracksState(newTracks);
                          showToast(`Removed track: ${track.name}. Click Save below to apply.`);
                        }}
                        className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl transition-all self-end shrink-0"
                        title="Delete Track"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Track Input Row */}
              <div className="border-t border-outline-variant/10 pt-5 space-y-4">
                <span className="text-[10px] text-outline font-bold uppercase tracking-wider block">
                  Add New Focus Track
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="newTrackName" className="text-[10px] text-outline font-bold">
                      TRACK DISPLAY NAME
                    </label>
                    <input
                      type="text"
                      id="newTrackName"
                      value={newTrackName}
                      onChange={(e) => {
                        setNewTrackName(e.target.value);
                        // Generate dynamic slug: lowercase alphanumeric, dashes instead of spaces
                        const generatedSlug = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9\s-]/g, "")
                          .trim()
                          .replace(/\s+/g, "-");
                        setNewTrackSlug(generatedSlug);
                      }}
                      className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none text-foreground focus:border-primary text-xs font-bold"
                      placeholder="e.g. Visual Effects"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="newTrackSlug" className="text-[10px] text-outline font-bold">
                      GENERATED TRACK SLUG / KEY
                    </label>
                    <input
                      type="text"
                      id="newTrackSlug"
                      value={newTrackSlug}
                      onChange={(e) => setNewTrackSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className="input-focus rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none text-foreground focus:border-primary text-xs font-mono font-bold"
                      placeholder="generated-slug"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTrackName.trim()) {
                        showToast("Please enter a valid track name.", "error");
                        return;
                      }
                      if (!newTrackSlug.trim()) {
                        showToast("Please enter or generate a valid track key.", "error");
                        return;
                      }
                      if (focusTracks.some((t) => t.id === newTrackSlug)) {
                        showToast("A track with this key already exists.", "error");
                        return;
                      }
                      const updatedTracks = [...focusTracks, { id: newTrackSlug, name: newTrackName.trim() }];
                      handleUpdateFocusTracksState(updatedTracks);
                      setNewTrackName("");
                      setNewTrackSlug("");
                      showToast(`Added track: ${newTrackName}. Click Save below to apply.`);
                    }}
                    className="w-full bg-[#1b1933] border border-primary/20 hover:bg-primary/10 hover:border-primary text-primary font-bold py-3 px-5 rounded-2xl transition-all flex items-center justify-center space-x-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Track Option</span>
                  </button>
                </div>
              </div>

              {/* Master Save Button for Focus Tracks */}
              <div className="pt-4 border-t border-outline-variant/10 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    const payload = { ...config, focusTracks };
                    await pushConfigUpdate(payload, "Focus track customizations saved successfully!");
                  }}
                  className="w-full sm:w-auto bg-primary text-background hover:bg-primary-hover font-bold py-3.5 px-8 rounded-2xl transition-all shadow-glow flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  <span>Save Custom Focus Tracks</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PARTICIPANT DELETE CONFIRMATION MODAL */}
        {deletingParticipant && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm select-none animate-fade-in"
            onClick={() => setDeletingParticipant(null)}
          >
            <div
              className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-2xl relative space-y-5 text-center animate-scale-up"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-2xl border border-rose-500/20">
                ⚠️
              </div>

              <div className="space-y-2">
                <h3 className="font-sora text-lg font-black text-foreground">Remove Registration Record?</h3>
                <p className="font-hanken text-xs text-foreground/75 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-foreground font-black">{deletingParticipant.fullName}</strong> (
                  {deletingParticipant.email})?
                </p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-500/5 py-2 px-3 rounded-lg border border-rose-500/10">
                  Warning: This action is absolute and cannot be undone. Their digital ticket entry code{" "}
                  <span className="font-mono">{deletingParticipant.id}</span> will be permanently deactivated.
                </p>
              </div>

              <div className="pt-2 flex space-x-3 text-xs font-semibold">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeletingParticipant(null)}
                  className="flex-1 bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high text-foreground font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteParticipant}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-rose-900/10 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {deleteLoading ? (
                    <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin"></div>
                  ) : (
                    <span>Delete Record</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
