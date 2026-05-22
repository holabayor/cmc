"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  // Theme state
  const [darkMode, setDarkMode] = useState(false);

  // Responsive Navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal / Speaker Detail states
  const [selectedSpeaker, setSelectedSpeaker] = useState(null);

  // Dynamic Site Settings state
  const [config, setConfig] = useState(null);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Schedule filtering state
  const [scheduleFilter, setScheduleFilter] = useState("all"); // 'all', 'morning', 'afternoon'

  // Registration Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    focus: "",
    church: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverFeedback, setServerFeedback] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [recentRegistration, setRecentRegistration] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [htmlToImageReady, setHtmlToImageReady] = useState(false);

  // Ticket Retrieval states
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Fetch dynamic page configurations
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setRegistrationCount(data.registrationCount);
      }
    } catch (err) {
      console.error("Failed to load dynamic configurations, using fallbacks.", err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Initial mount configurations fetch, theme sync, and dynamic image export library setup
  useEffect(() => {
    fetchConfig();

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    // Dynamic load of high-fidelity HTML-to-Image converter library with duplicate protection
    const cdnUrl = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js";
    if (typeof window !== "undefined") {
      if (window.htmlToImage) {
        setHtmlToImageReady(true);
      } else {
        const existingScript = document.querySelector(`script[src="${cdnUrl}"]`);
        if (existingScript) {
          existingScript.addEventListener("load", () => setHtmlToImageReady(true));
        } else {
          const script = document.createElement("script");
          script.src = cdnUrl;
          script.async = true;
          script.onload = () => setHtmlToImageReady(true);
          document.body.appendChild(script);
        }
      }
    }
  }, []);

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

  // Keyboard accessibility helper for interactive elements
  const handleKeyDown = (e, action) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  // Field validation
  const validateField = (name, value) => {
    let error = "";
    if (name === "fullName") {
      if (!value.trim()) error = "Full name is required.";
    } else if (name === "email") {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!value.trim()) {
        error = "Email address is required.";
      } else if (!emailRegex.test(value)) {
        error = "Please enter a valid email address.";
      }
    } else if (name === "focus") {
      if (!value) {
        error = "Please select a media focus track.";
      } else {
        const activeTracks = config?.focusTracks || [
          { id: "video", name: "Video Production" },
          { id: "audio", name: "Audio & Sound" },
          { id: "design", name: "Graphic Design" },
          { id: "social", name: "Social Media" },
          { id: "content", name: "Content Strategy" }
        ];
        if (!activeTracks.some((t) => t.id === value)) {
          error = "Please select a valid media focus track.";
        }
      }
    }
    return error;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (formErrors[id]) {
      setFormErrors((prev) => ({ ...prev, [id] : "" }));
    }
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    const error = validateField(id, value);
    setFormErrors((prev) => ({ ...prev, [id]: error }));
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerFeedback(null);

    const errors = {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      focus: validateField("focus", formData.focus)
    };

    const hasErrors = Object.values(errors).some((err) => err !== "");
    if (hasErrors) {
      setFormErrors(errors);
      const firstErrorKey = Object.keys(errors).find((key) => errors[key] !== "");
      const errorEl = document.getElementById(firstErrorKey);
      if (errorEl) errorEl.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setRecentRegistration(result.registration);
        setRegistrationCount((prev) => prev + 1);
        setShowSuccessModal(true);
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          focus: "",
          church: ""
        });
        setFormErrors({});
      } else {
        setServerFeedback({
          type: "error",
          message: result.error || "Something went wrong. Please check fields and try again."
        });
      }
    } catch (error) {
      setServerFeedback({
        type: "error",
        message: "Network connection failed. Please ensure you are online and try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ticket Retrieval handler
  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError("");
    if (!lookupEmail.trim()) {
      setLookupError("Please enter your registered email address.");
      return;
    }

    setLookupLoading(true);

    try {
      const res = await fetch(`/api/register?email=${encodeURIComponent(lookupEmail.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRecentRegistration(data.registration);
        setShowLookupModal(false);
        setShowSuccessModal(true);
        setLookupEmail("");
      } else {
        setLookupError(data.error || "No registration record found for this email.");
      }
    } catch (err) {
      setLookupError("Lookup failed. Please verify your connection.");
    } finally {
      setLookupLoading(false);
    }
  };

  // High-fidelity client-side Access Card PNG Exporter utilizing html-to-image with dynamic polling and load detection
  const handleDownloadTicketImage = async () => {
    const cardElement = document.getElementById("digital-ticket-pass");
    if (!cardElement) return;

    setDownloadLoading(true);

    // Helper promise to wait for window.htmlToImage to become active in global scope (up to 4s)
    const waitForLibrary = () => {
      return new Promise((resolve) => {
        if (typeof window !== "undefined" && window.htmlToImage) {
          resolve(window.htmlToImage);
          return;
        }

        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (typeof window !== "undefined" && window.htmlToImage) {
            clearInterval(interval);
            resolve(window.htmlToImage);
          } else if (attempts >= 40) { // 40 attempts * 100ms = 4 seconds limit
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
      });
    };

    try {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js";
      if (typeof window !== "undefined" && !window.htmlToImage) {
        const existingScript = document.querySelector(`script[src="${cdnUrl}"]`);
        if (!existingScript) {
          const script = document.createElement("script");
          script.src = cdnUrl;
          script.async = true;
          document.body.appendChild(script);
        }
      }

      const exporter = await waitForLibrary();

      if (exporter) {
        // Generate PNG data URL at 2x resolution for ultra-sharp high-fidelity text details
        const dataUrl = await exporter.toPng(cardElement, {
          backgroundColor: "#0b081c", // Premium dark theme HSL color
          pixelRatio: 2, // Double resolution scaling
          style: {
            transform: 'scale(1)',
            borderRadius: '24px', // Card curving
          },
          cacheBust: true
        });

        // Trigger safe browser virtual download anchor link
        const nameSlug = recentRegistration.fullName.trim().replace(/\s+/g, "_");
        const link = document.createElement("a");
        link.download = `Kingdom_Creatives_Pass_${nameSlug}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Image exporter took too long to load. Please verify your connection or try the Print/PDF option!");
      }
    } catch (error) {
      console.error("[IMAGE GENERATION ERROR] html-to-image generation failed:", error);
      alert("Failed to export your ticket as an image. You can still use the standard Print/PDF option!");
    } finally {
      setDownloadLoading(false);
    }
  };

  // Colors mapping for media tracks
  const trackColors = {
    video: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", glow: "from-purple-500" },
    audio: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", glow: "from-red-500" },
    design: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", glow: "from-amber-500" },
    social: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", glow: "from-blue-500" },
    content: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", glow: "from-cyan-500" }
  };

  // Safe helper to get colors for any track (with beautiful fallback)
  const getTrackColors = (focusId) => {
    if (!focusId) return { bg: "bg-white/5", border: "border-white/10", text: "text-white/80", glow: "from-purple-500" };
    return trackColors[focusId] || {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      glow: "from-purple-500"
    };
  };

  const focusTracks = config?.focusTracks || [
    { id: "video", name: "Video Production" },
    { id: "audio", name: "Audio & Sound" },
    { id: "design", name: "Graphic Design" },
    { id: "social", name: "Social Media" },
    { id: "content", name: "Content Strategy" }
  ];

  // Get active configuration values or static seeder fallbacks
  const eventTitle = config?.eventTitle || "Creative Create 2026";
  const eventDate = config?.eventDate || "July 4th, 2026 • 10:00 AM";
  const speakers = config?.speakers || [];
  const schedule = config?.schedule || [];
  const registrationLimit = config?.registrationLimit || 100;
  const isRegistrationEnabled = config?.isRegistrationEnabled ?? true;
  const closedMessage = config?.registrationClosedMessage || "Registration is now full. Thank you for your interest!";
  const isSoldOut = registrationCount >= registrationLimit || !isRegistrationEnabled;

  const filteredSchedule = schedule.filter((item) => {
    if (scheduleFilter === "all") return true;
    return item.period === scheduleFilter;
  });

  if (isLoadingConfig) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#06050c] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-primary border-primary-container rounded-full animate-spin"></div>
          <span className="font-sora text-sm font-semibold tracking-wider text-outline uppercase animate-pulse">Loading Conference Hub...</span>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p.charAt(0)).join("").toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col relative w-full">
      {/* 1. Header & Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-outline-variant/10 transition-all duration-300">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 lg:px-12 h-20">
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center cursor-pointer select-none"
          >
            <img 
              src="/logo.png" 
              alt="Kingdom Creatives Logo" 
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#speakers" className="text-sm font-semibold hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1">Speakers</a>
            <a href="#schedule" className="text-sm font-semibold hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1">Schedule</a>
            <a href="#register" className="text-sm font-semibold hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1">Register</a>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* Dark/Light mode selector */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-foreground/80 hover:text-primary hover:bg-surface-container-high transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 9.9a5 5 0 117.07 0l2.828-9.9z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <a 
              href="#register" 
              className="bg-primary text-background hover:bg-primary-hover font-semibold text-sm px-6 py-2.5 rounded-full transition-all focus:outline-none focus:ring-4 focus:ring-primary/30"
            >
              {isSoldOut ? "Check Slots" : "Secure Spot"}
            </a>
          </div>

          {/* Mobile hamburger icon */}
          <div className="flex md:hidden items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-foreground/80 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 9.9a5 5 0 117.07 0l2.828-9.9z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-b border-outline-variant/10 px-6 py-6 space-y-4 animate-fade-in">
            <a href="#speakers" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-primary transition-colors py-2">Speakers</a>
            <a href="#schedule" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-primary transition-colors py-2">Schedule</a>
            <a href="#register" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-primary transition-colors py-2">Register</a>
            <a 
              href="#register" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center bg-primary text-background hover:bg-primary-hover font-semibold text-sm px-6 py-3 rounded-full transition-all"
            >
              {isSoldOut ? "Check Slots" : "Secure Spot"}
            </a>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-24 px-6 md:px-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/background.png" 
            alt="Kingdom Creatives backdrop" 
            fill
            priority
            className="animate-float-slow select-none pointer-events-none scale-102 object-cover"
          />
          <div className="absolute inset-0 bg-[#06050c]/50 dark:bg-[#06050c]/70 mix-blend-multiply transition-colors duration-300"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#06050c] via-transparent to-[#06050c]/30"></div>
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center text-white flex flex-col items-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-md animate-pulse-slow mb-8">
            <span className="w-2.5 h-2.5 bg-secondary-container rounded-full animate-pulse"></span>
            <span className="font-hanken font-semibold text-xs tracking-wide uppercase text-white/90">{eventDate}</span>
          </div>
          
          <h1 className="font-sora text-4xl sm:text-5xl lg:text-[72px] lg:leading-[82px] font-extrabold tracking-tight mb-8">
            Kingdom Creatives<br/>
            <span className="text-secondary-container bg-clip-text">{eventTitle}</span>
          </h1>
          
          <p className="font-hanken text-lg sm:text-xl text-primary-fixed-dim max-w-2xl text-center mb-10 leading-relaxed">
            A premium gathering for kingdom media creators, blending deep spiritual authority with modern creative technology. Equip yourself to impact the digital frontier.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 text-sm font-semibold mb-12">
            <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl">
              <svg className="w-5 h-5 text-secondary-container" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span>Clemzeal Hall, Uniosun, Osogbo</span>
            </div>
          </div>
          
          <a 
            href="#register" 
            className="bg-secondary-container hover:bg-secondary-container/95 hover:scale-105 active:scale-95 text-on-secondary-container font-sora font-extrabold text-base px-10 py-4 rounded-full shadow-lg hover:shadow-[0_0_25px_rgba(251,191,36,0.35)] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-secondary-container/40 inline-flex items-center justify-center"
          >
            {isSoldOut ? "Check Slots Status" : "Secure Your Spot Now"}
          </a>
        </div>
      </section>

      {/* Main content body */}
      <main className="relative z-10 bg-background text-foreground transition-colors duration-300">
        
        {/* 3. Speakers Section */}
        <section id="speakers" className="py-24 px-6 md:px-12 max-w-7xl mx-auto scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-foreground mb-4">Featured Speakers</h2>
            <p className="font-hanken text-foreground/75 text-lg">Learn hands-on from spiritual mentors and leading industry creative engineers driving modern gospel expansion.</p>
          </div>

          {speakers.length === 0 ? (
            <div className="text-center text-outline font-semibold py-12">No guest speakers registered yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {speakers.map((speaker) => (
                <div 
                  key={speaker.id}
                  tabIndex={0}
                  role="button"
                  aria-haspopup="dialog"
                  aria-label={`View bio for ${speaker.name}, ${speaker.role}`}
                  onClick={() => setSelectedSpeaker(speaker)}
                  onKeyDown={(e) => handleKeyDown(e, () => setSelectedSpeaker(speaker))}
                  className="glass-panel glass-panel-hover rounded-3xl p-6 text-center cursor-pointer relative group focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary/30 to-secondary-container/40 mx-auto mb-6 flex items-center justify-center border-2 border-primary/20 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                    {speaker.image ? (
                      <img 
                        src={speaker.image} 
                        alt={speaker.name} 
                        className="w-full h-full object-cover select-none" 
                      />
                    ) : (
                      <span className="font-sora text-2xl font-bold text-primary dark:text-foreground">
                        {getInitials(speaker.name)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-sora text-lg font-bold text-foreground mb-1 group-hover:text-primary dark:group-hover:text-primary transition-colors">{speaker.name}</h3>
                  <p className="text-sm font-semibold text-outline mb-4">{speaker.role}</p>
                  <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary bg-primary/5 px-3.5 py-1.5 rounded-full dark:bg-primary-container/20">
                    <span>View Details</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Timetable Schedule */}
        <section id="schedule" className="py-24 px-6 md:px-12 bg-surface-container-low transition-colors duration-300 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-foreground mb-4">Conference Schedule</h2>
              <p className="font-hanken text-foreground/75 text-lg">A full day of technical sessions, panel groups, and network circles built for your progress.</p>
            </div>

            {/* Timetable sliding filtering tab buttons */}
            <div className="flex justify-center mb-10 p-1.5 bg-surface-container-high/40 rounded-full border border-outline-variant/30 max-w-md mx-auto relative z-10">
              {["all", "morning", "afternoon"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setScheduleFilter(tab)}
                  className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${scheduleFilter === tab ? "bg-primary text-background shadow-md" : "text-foreground/75 hover:text-foreground hover:bg-surface-container-high/20"}`}
                >
                  {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* List rendered schedule */}
            {schedule.length === 0 ? (
              <div className="text-center text-outline font-semibold py-12">No event timetable configured yet.</div>
            ) : (
              <div className="space-y-6">
                {filteredSchedule.map((item, idx) => {
                  const hasTracks = item.tracks && item.tracks.length > 0;
                  return (
                    <div 
                      key={item.id || idx}
                      className={`glass-panel p-6 rounded-3xl border-l-4 hover:translate-x-1 transition-transform duration-200 ${hasTracks ? "border-l-secondary-container" : "border-l-primary"}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                        <span className="font-sora text-lg font-extrabold text-primary">{item.time}</span>
                        <span className={`inline-flex items-center self-start md:self-auto text-xs font-semibold uppercase px-3 py-1 rounded-full ${hasTracks ? "bg-secondary-container/10 text-secondary" : "bg-primary/5 text-primary"}`}>
                          {hasTracks ? "Interactive Workshops" : (item.category === "general" ? "General Assembly" : item.category || "General Assembly")}
                        </span>
                      </div>
                      
                      <h3 className="font-sora text-xl font-bold text-foreground mb-3">{item.title}</h3>
                      <p className="font-hanken text-sm text-foreground/80 mb-4 leading-relaxed">{item.description}</p>
                      
                      {item.speaker && (
                        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-outline">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                          <span>Led by {item.speaker}</span>
                        </div>
                      )}

                      {hasTracks && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-outline-variant/10">
                          {item.tracks.map((track, tIdx) => (
                            <div key={tIdx} className="bg-surface-container-high/40 rounded-2xl p-4 border border-outline-variant/20">
                              <span className="text-[10px] font-extrabold uppercase text-secondary tracking-wide mb-1 block">
                                {track.name}
                              </span>
                              <h4 className="font-sora text-sm font-bold text-foreground mb-2">
                                {track.title}
                              </h4>
                              <span className="text-xs text-outline font-semibold">
                                Speakers: {track.speakers}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 5. Registration Section */}
        <section id="register" className="py-24 px-6 md:px-12 max-w-3xl mx-auto scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-foreground mb-4">Register Now</h2>
            <p className="font-hanken text-foreground/75 text-lg">
              {isSoldOut 
                ? "Admission is closed" 
                : <>Secure your spot for the Creative Create Conference 2026. Fields marked with <span className="text-error font-bold">*</span> are required.</>
              }
            </p>
          </div>

          {isSoldOut ? (
            /* Render Closed state */
            <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-error/20 bg-error-container/5 text-center shadow-xl space-y-6">
              <div className="w-16 h-16 rounded-full bg-error-container/20 flex items-center justify-center mx-auto text-error shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="font-sora text-2xl font-extrabold text-error">Registration Closed</h3>
              <p className="font-hanken text-foreground/80 leading-relaxed max-w-md mx-auto">
                {closedMessage}
              </p>
              <div className="border-t border-outline-variant/15 pt-6 mt-6 max-w-xs mx-auto">
                <p className="text-xs font-semibold text-outline mb-3">Already registered? Retrieve your dynamic entry pass below:</p>
                <button
                  onClick={() => setShowLookupModal(true)}
                  className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 font-bold text-xs py-2 px-5 rounded-xl transition-all"
                >
                  Retrieve Existing Ticket
                </button>
              </div>
            </div>
          ) : (
            /* Render Register Active Form */
            <form 
              onSubmit={handleSubmit}
              className="glass-panel p-6 sm:p-10 rounded-3xl space-y-6 shadow-xl relative"
              noValidate
            >
              {serverFeedback && (
                <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center space-x-2 ${serverFeedback.type === "error" ? "bg-error-container/20 border-error text-error" : "bg-primary/5 border-primary text-primary"}`}>
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{serverFeedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="fullName">
                    Full Name <span className="text-error font-bold">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    aria-invalid={!!formErrors.fullName}
                    aria-describedby={formErrors.fullName ? "fullName-error" : undefined}
                    className={`input-focus w-full rounded-2xl border bg-surface-container-low px-4 py-3.5 text-sm outline-none text-foreground ${formErrors.fullName ? "border-error focus:ring-error/20" : "border-outline-variant/30 focus:border-primary"}`}
                    placeholder="e.g. David Okafor"
                    required
                  />
                  {formErrors.fullName && (
                    <span id="fullName-error" className="text-xs font-bold text-error mt-1">{formErrors.fullName}</span>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="email">
                    Email Address <span className="text-error font-bold">*</span>
                  </label>
                  <input 
                    type="email" 
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    aria-invalid={!!formErrors.email}
                    aria-describedby={formErrors.email ? "email-error" : undefined}
                    className={`input-focus w-full rounded-2xl border bg-surface-container-low px-4 py-3.5 text-sm outline-none text-foreground ${formErrors.email ? "border-error focus:ring-error/20" : "border-outline-variant/30 focus:border-primary"}`}
                    placeholder="e.g. david@creative.com"
                    required
                  />
                  {formErrors.email && (
                    <span id="email-error" className="text-xs font-bold text-error mt-1">{formErrors.email}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Phone */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="phone">
                    Phone Number
                  </label>
                  <input 
                    type="tel" 
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input-focus w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3.5 text-sm outline-none focus:border-primary text-foreground"
                    placeholder="e.g. +234 80 1234 5678"
                  />
                </div>

                {/* Media Focus Select */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="focus">
                    Primary Media Focus <span className="text-error font-bold">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      id="focus"
                      value={formData.focus}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      aria-invalid={!!formErrors.focus}
                      aria-describedby={formErrors.focus ? "focus-error" : undefined}
                      className={`input-focus w-full rounded-2xl border bg-surface-container-low px-4 py-3.5 text-sm outline-none appearance-none text-foreground ${formErrors.focus ? "border-error focus:ring-error/20" : "border-outline-variant/30 focus:border-primary"}`}
                      required
                    >
                      <option value="">Select your focus track</option>
                      {focusTracks.map((track) => (
                        <option key={track.id} value={track.id}>
                          {track.name}
                        </option>
                      ))}
                    </select>
                    {/* Custom Arrow for select */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-foreground/75">
                      <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                  {formErrors.focus && (
                    <span id="focus-error" className="text-xs font-bold text-error mt-1">{formErrors.focus}</span>
                  )}
                </div>
              </div>

              {/* Church/Affiliation */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-bold text-foreground" htmlFor="church">
                  Church / Organization Name
                </label>
                <input 
                  type="text" 
                  id="church"
                  value={formData.church}
                  onChange={handleInputChange}
                  className="input-focus w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3.5 text-sm outline-none focus:border-primary text-foreground"
                  placeholder="Where do you serve?"
                />
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowLookupModal(true)}
                  className="text-primary hover:underline text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                >
                  Already Registered? Retrieve Dynamic Entry Pass
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] text-background font-sora font-extrabold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-4 focus:outline-none focus:ring-4 focus:ring-primary/20"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-t-background border-outline rounded-full animate-spin shrink-0"></div>
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Complete Registration</span>
                )}
              </button>
            </form>
          )}
        </section>
      </main>

      {/* 6. Footer Block */}
      <footer className="bg-surface-container border-t transition-colors duration-300 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Kingdom Creatives Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-outline leading-relaxed max-w-xs">
              © 2026 Kingdom Creatives. All rights reserved. Equipping media ministries with structural creative energy.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Event Tracks</h4>
            <ul className="space-y-2 text-sm text-foreground/80 font-semibold">
              <li>Video Production</li>
              <li>Acoustic &amp; Broadcast Audio</li>
              <li>Graphic Branding</li>
              <li>Social Media &amp; Search Strategy</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li><a href="#speakers" className="hover:text-primary transition-colors font-semibold">Speakers Info</a></li>
              <li><a href="#schedule" className="hover:text-primary transition-colors font-semibold">Interactive Timetable</a></li>
              <li><a href="#register" className="hover:text-primary transition-colors font-semibold">Secure a Seat</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Support &amp; Legal</h4>
            <ul className="space-y-2 text-sm text-foreground/80 font-semibold">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="/admin" className="hover:text-primary transition-colors text-primary font-bold">Admin Portal</a></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* 7. Dialog Pop-Up speaker details modal */}
      {selectedSpeaker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06050c]/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedSpeaker(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedSpeaker.name} detail view`}
        >
          <div 
            className="glass-panel w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedSpeaker(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#06050c]/40 hover:bg-[#06050c]/60 text-white/90 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-container shrink-0 flex items-center justify-center text-background text-3xl font-black shadow-lg overflow-hidden select-none">
                  {selectedSpeaker.image ? (
                    <img 
                      src={selectedSpeaker.image} 
                      alt={selectedSpeaker.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    selectedSpeaker.name.charAt(0)
                  )}
                </div>
                <div>
                  <span className={`inline-flex px-2 py-0.5 text-[9px] font-black tracking-widest uppercase rounded-full ${getTrackColors(selectedSpeaker.focus).bg} ${getTrackColors(selectedSpeaker.focus).text} ${getTrackColors(selectedSpeaker.focus).border} border mb-2`}>
                    {focusTracks.find(t => t.id === selectedSpeaker.focus)?.name || selectedSpeaker.focus || "General"} Track
                  </span>
                  <h3 className="font-sora text-xl font-extrabold text-foreground leading-tight">{selectedSpeaker.name}</h3>
                  <p className="font-hanken text-sm text-foreground/70 mt-1 font-semibold">{selectedSpeaker.role}</p>
                </div>
              </div>

              <div className="border-t border-outline-variant/10 pt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-outline uppercase tracking-wider mb-1">Speaker Bio</h4>
                  <p className="font-hanken text-sm text-foreground/80 leading-relaxed font-semibold">{selectedSpeaker.bio}</p>
                </div>

                {selectedSpeaker.session && (
                  <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/10">
                    <h4 className="text-xs font-black text-primary uppercase tracking-wide">Featured Session</h4>
                    <p className="font-sora text-sm font-bold text-foreground mt-1.5 leading-snug">{selectedSpeaker.session}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setSelectedSpeaker(null)}
                  className="bg-surface-container-high text-foreground hover:bg-surface-container-highest font-semibold py-2.5 px-6 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Back to Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Success Feedback Modal with Dynamic Ticket Pass */}
      {showSuccessModal && recentRegistration && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#06050c]/70 backdrop-blur-md overflow-y-auto animate-fade-in"
          onClick={() => setShowSuccessModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative text-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Success Ribbon */}
            <div className="h-20 bg-gradient-to-br from-primary to-primary-container relative flex items-center justify-center">
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/35 text-white/90 focus:outline-none focus:ring-2 focus:ring-background"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center shadow-lg border-2 border-surface shrink-0">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              <h3 className="font-sora text-xl font-extrabold text-primary">Registration Verified!</h3>
              <p className="font-hanken text-xs text-foreground/80 max-w-xs mx-auto">
                Here is your official dynamic gate entry ticket. Bring this QR Code on your phone on event day for quick entry!
              </p>

              {/* DYNAMIC DIGITAL TICKET PASS */}
              <div id="digital-ticket-pass" className="relative border-2 border-dashed border-primary/30 bg-gradient-to-br from-[#120f26]/85 to-[#0b081c]/90 rounded-3xl p-5 shadow-2xl overflow-hidden mt-4 text-left">
                {/* Pass Cutout circles */}
                <div className="absolute top-1/2 -left-3.5 w-6 h-6 rounded-full bg-[#06050c] transform -translate-y-1/2 border-r border-dashed border-primary/20"></div>
                <div className="absolute top-1/2 -right-3.5 w-6 h-6 rounded-full bg-[#06050c] transform -translate-y-1/2 border-l border-dashed border-primary/20"></div>

                {/* Focus track specific visual halo */}
                {recentRegistration.focus && (
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-2xl opacity-40 bg-gradient-to-br ${getTrackColors(recentRegistration.focus).glow} to-transparent`}></div>
                )}
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4 select-text">
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                      ALL ACCESS HUB ENTRY
                    </span>
                    <h4 className="font-sora text-lg font-extrabold mt-2 text-white leading-tight">
                      {recentRegistration.fullName}
                    </h4>
                    <p className="text-[10px] text-white/70 font-semibold mt-1 truncate max-w-[190px]">
                      {recentRegistration.email}
                    </p>
                  </div>
                  
                  {/* Dynamic QR Code from public generator API */}
                  <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0 border border-primary/30">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(recentRegistration.id)}&color=0b081c&bgcolor=ffffff`}
                      alt="Ticket QR Code"
                      width={90}
                      height={90}
                      crossOrigin="anonymous"
                      className="w-20 h-20 sm:w-24 sm:h-24 select-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 text-xs mb-4 select-text">
                  <div>
                    <span className="text-[9px] text-outline font-bold uppercase tracking-wider block">MEDIA FOCUS</span>
                    <span className="font-semibold text-white text-[11px] flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${recentRegistration.focus ? getTrackColors(recentRegistration.focus).glow.replace("from-", "bg-") : "bg-primary"}`}></span>
                      {focusTracks.find(t => t.id === recentRegistration.focus)?.name || recentRegistration.focus} Track
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline font-bold uppercase tracking-wider block">AFFILIATION</span>
                    <span className="font-semibold text-white truncate block text-[11px]">{recentRegistration.church || "Community Creator"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline font-bold uppercase tracking-wider block">DATE & TIME</span>
                    <span className="font-semibold text-white text-[11px] truncate block">{eventDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline font-bold uppercase tracking-wider block">TICKET ID</span>
                    <span className="font-semibold font-mono text-primary truncate block text-[11px]">{recentRegistration.id}</span>
                  </div>
                </div>

                <div className="text-xs mb-4 select-text">
                  <span className="text-[9px] text-outline font-bold uppercase tracking-wider block">VENUE</span>
                  <span className="font-semibold text-white text-[11px] block">Clemzeal Hall, Uniosun, Osogbo</span>
                </div>

                <div className="border-t border-dashed border-white/10 my-3.5"></div>

                <div className="flex justify-between items-center text-[8px] text-outline font-black tracking-wide select-none">
                  <span>© 2026 KINGDOM CREATIVES</span>
                  <span className="text-emerald-500 flex items-center gap-1">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    VERIFIED TICKET
                  </span>
                </div>
              </div>

              {/* Utility actions: Download PNG, Print PDF, Return */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button 
                  onClick={handleDownloadTicketImage}
                  disabled={downloadLoading}
                  className="flex-1 bg-primary text-background hover:bg-primary-hover font-bold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-70"
                >
                  {downloadLoading ? (
                    <div className="w-4 h-4 border-2 border-t-background border-outline rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      <span>Download PNG</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-surface-container-high hover:bg-surface-container-highest font-bold py-3.5 px-4 rounded-2xl text-xs transition-all border border-outline-variant/15 flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  <span>Print / PDF</span>
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high font-bold py-3.5 px-4 rounded-2xl text-xs transition-all focus:outline-none text-foreground/80"
                >
                  Return to Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Ticket Lookup Modal */}
      {showLookupModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#06050c]/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowLookupModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowLookupModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#06050c]/40 hover:bg-[#06050c]/60 text-white/90 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close lookup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="p-6 sm:p-8 space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              <div>
                <h3 className="font-sora text-xl font-extrabold text-foreground">Lookup Active Ticket</h3>
                <p className="font-hanken text-xs text-foreground/75 mt-1 leading-relaxed">
                  Lost your ticket card? Type in the email address you registered with, and we will instantly fetch your official dynamic ticket.
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-4 text-left">
                {lookupError && (
                  <div className="p-3 bg-error-container/20 border border-error text-error rounded-xl text-xs font-bold flex items-center space-x-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{lookupError}</span>
                  </div>
                )}

                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wide" htmlFor="lookupEmail">
                    Registered Email Address
                  </label>
                  <input 
                    type="email" 
                    id="lookupEmail"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    className="input-focus w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none text-foreground"
                    placeholder="david@creative.com"
                    required
                  />
                </div>

                <div className="pt-2 flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowLookupModal(false)}
                    className="flex-1 bg-surface-container-high text-foreground hover:bg-surface-container-highest font-bold py-3.5 rounded-2xl text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={lookupLoading}
                    className="flex-1 bg-primary text-background hover:bg-primary-hover font-bold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center space-x-1 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {lookupLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-background border-outline rounded-full animate-spin shrink-0"></div>
                        <span>Retrieving...</span>
                      </>
                    ) : (
                      <span>Search & Download</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
