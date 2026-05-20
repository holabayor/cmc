"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// Speaker Data with robust profiles
const SPEAKERS = [
  {
    id: "david",
    name: "David Okafor",
    role: "Creative Director",
    avatar: "/api/placeholder/128/128", // Fallback, will render custom icon or gradient
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
];

// Schedule Data mapped by time and categories
const SCHEDULE = [
  {
    time: "09:00 AM",
    title: "Arrival, Networking & Check-In",
    category: "general",
    period: "morning",
    speaker: null,
    description: "Collect your custom badges, explore the creative hub, connect with other participants, and grab a morning coffee."
  },
  {
    time: "10:00 AM",
    title: "Keynote: Looping Gospel through Creativity",
    category: "general",
    period: "morning",
    speaker: "Pastor John Doe",
    description: "A foundational session addressing the theological and practical mandate for kingdom creators in a rapidly changing digital economy."
  },
  {
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
    time: "01:00 PM",
    title: "Community Lunch Break & Panel Circles",
    category: "general",
    period: "afternoon",
    speaker: null,
    description: "Enjoy catering on-site and connect with fellow creators in themed discussion circles based on your creative tracks."
  },
  {
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
    time: "04:00 PM",
    title: "Frontier Creatives: The Future of Kingdom Media",
    category: "general",
    period: "afternoon",
    speaker: "All Featured Speakers",
    description: "An open panel and interactive Q&A session covering AI tools, cloud collaboration, content longevity, and digital missions."
  }
];

export default function Home() {
  // Theme state
  const [darkMode, setDarkMode] = useState(false);

  // Responsive Navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal / Speaker Detail states
  const [selectedSpeaker, setSelectedSpeaker] = useState(null);

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

  // Sync theme with HTML document element
  useEffect(() => {
    // Read local storage on initial mount
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
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

  // Keyboard accessibility helper for interactive cards
  const handleKeyDown = (e, action) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  // Real-time Field Validation
  const validateField = (name, value) => {
    let error = "";
    if (name === "fullName") {
      if (!value.trim()) error = "Full name is required.";
    } else if (name === "email") {
      if (!value.trim()) {
        error = "Email address is required.";
      } else {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!re.test(value.trim())) error = "Please enter a valid email address.";
      }
    } else if (name === "focus") {
      if (!value) error = "Please select your primary media focus.";
    }
    return error;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    
    // Validate on type
    const error = validateField(id, value);
    setFormErrors((prev) => ({ ...prev, [id]: error }));
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    const error = validateField(id, value);
    setFormErrors((prev) => ({ ...prev, [id]: error }));
  };

  // Form Submit Handler connecting to API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerFeedback(null);

    // Validate all fields
    const errors = {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      focus: validateField("focus", formData.focus)
    };

    const hasErrors = Object.values(errors).some((err) => err !== "");
    if (hasErrors) {
      setFormErrors(errors);
      
      // Auto-focus on the first error input for accessibility
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
        // Success
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
        // Server Validation Error / Conflict
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

  // Filtered Schedule items based on tabs
  const filteredSchedule = SCHEDULE.filter((item) => {
    if (scheduleFilter === "all") return true;
    return item.period === scheduleFilter;
  });

  return (
    <div className="flex-1 flex flex-col relative w-full">
      {/* 1. Header & Navigation (Accessible, mobile-optimized) */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b transition-all duration-300">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 lg:px-12 h-20">
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="font-sora text-xl lg:text-2xl font-extrabold tracking-tighter text-primary dark:text-primary cursor-pointer transition-colors"
          >
            CREATIVE CREATE
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
              Secure Spot
            </a>
          </div>

          {/* Mobile Menu Actions */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-foreground/80 hover:text-primary focus:outline-none"
              aria-label="Toggle Theme"
            >
              {darkMode ? (
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 9.9a5 5 0 117.07 0l2.828-9.9z" /></svg>
              ) : (
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground/80 hover:text-primary focus:outline-none"
              aria-expanded={mobileMenuOpen}
              aria-label="Main Menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-t py-4 px-6 flex flex-col space-y-4 animate-fade-in">
            <a 
              href="#speakers" 
              onClick={() => setMobileMenuOpen(false)}
              className="font-semibold text-lg py-2 border-b border-outline-variant/20 hover:text-primary transition-colors"
            >
              Speakers
            </a>
            <a 
              href="#schedule" 
              onClick={() => setMobileMenuOpen(false)}
              className="font-semibold text-lg py-2 border-b border-outline-variant/20 hover:text-primary transition-colors"
            >
              Schedule
            </a>
            <a 
              href="#register" 
              onClick={() => setMobileMenuOpen(false)}
              className="font-semibold text-lg py-2 hover:text-primary transition-colors"
            >
              Register Now
            </a>
          </div>
        )}
      </nav>

      {/* Main Core Layout */}
      <main className="flex-1 pt-20">
        
        {/* 2. Hero Section (Beautiful full bleed with your background asset) */}
        <section className="relative min-h-[90vh] flex items-center justify-center pt-16 pb-24 px-6 md:px-16 overflow-hidden">
          {/* Next.js Optimized Background Layer */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/background.png"
              alt="Kingdom Creatives backdrop"
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
              className="animate-float-slow select-none pointer-events-none scale-102"
            />
            {/* Custom Multi-layered overlays for gorgeous text contrast and glassmorphism styling */}
            <div className="absolute inset-0 bg-[#06050c]/50 dark:bg-[#06050c]/70 mix-blend-multiply transition-colors duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#06050c] via-transparent to-[#06050c]/30"></div>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center text-white flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-md animate-pulse-slow mb-8">
              <span className="w-2.5 h-2.5 bg-secondary-container rounded-full"></span>
              <span className="font-hanken font-semibold text-xs tracking-wide uppercase text-white/90">July 4th, 2026 • 10:00 AM</span>
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl lg:text-[72px] lg:leading-[82px] font-extrabold tracking-tight mb-8">
              Kingdom Creatives<br />
              <span className="text-secondary-container bg-clip-text">Creative Create 2026</span>
            </h1>

            <p className="font-hanken text-lg sm:text-xl text-primary-fixed-dim max-w-2xl text-center mb-10 leading-relaxed">
              A premium gathering for kingdom media creators, blending deep spiritual authority with modern creative technology. Equip yourself to impact the digital frontier.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 text-sm font-semibold mb-12">
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl">
                <svg className="w-5 h-5 text-secondary-container" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Clemzeal Hall, Uniosun, Osogbo</span>
              </div>
            </div>

            <a 
              href="#register" 
              className="bg-secondary-container hover:scale-105 active:scale-98 text-on-secondary-container font-sora font-extrabold text-md px-10 py-4.5 rounded-full shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-secondary-container/40"
            >
              Secure Your Spot Now
            </a>
          </div>
        </section>

        {/* 3. Featured Speakers Section */}
        <section id="speakers" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-foreground mb-4">Featured Speakers</h2>
            <p className="font-hanken text-foreground/75 text-lg">Learn hands-on from spiritual mentors and leading industry creative engineers driving modern gospel expansion.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {SPEAKERS.map((speaker) => (
              <div 
                key={speaker.id}
                onClick={() => setSelectedSpeaker(speaker)}
                onKeyDown={(e) => handleKeyDown(e, () => setSelectedSpeaker(speaker))}
                tabIndex={0}
                className="glass-panel glass-panel-hover rounded-3xl p-6 text-center cursor-pointer relative group focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                role="button"
                aria-label={`View bio for ${speaker.name}, ${speaker.role}`}
              >
                {/* Speaker profile container */}
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary/30 to-secondary-container/40 mx-auto mb-6 flex items-center justify-center border-2 border-primary/20 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <span className="font-sora text-2xl font-bold text-primary dark:text-foreground">
                    {speaker.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                
                <h3 className="font-sora text-lg font-bold text-foreground mb-1 group-hover:text-primary dark:group-hover:text-primary transition-colors">
                  {speaker.name}
                </h3>
                <p className="text-sm font-semibold text-outline mb-4">{speaker.role}</p>
                <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary bg-primary/5 px-3.5 py-1.5 rounded-full dark:bg-primary-container/20">
                  <span>View Details</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Conference Schedule Section (Interactive filtering) */}
        <section id="schedule" className="py-24 px-6 md:px-12 bg-surface-container-low transition-colors duration-300">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-foreground mb-4">Conference Schedule</h2>
              <p className="font-hanken text-foreground/75 text-lg">A full day of technical sessions, panel groups, and network circles built for your progress.</p>
            </div>

            {/* Slider Tabs for Mobile Schedule Selection */}
            <div className="flex justify-center mb-10 p-1.5 bg-surface-container-high/40 rounded-full border border-outline-variant/30 max-w-md mx-auto relative z-10">
              <button 
                onClick={() => setScheduleFilter("all")}
                className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${scheduleFilter === "all" ? "bg-primary text-background shadow-md" : "text-foreground/75 hover:text-foreground"}`}
              >
                All
              </button>
              <button 
                onClick={() => setScheduleFilter("morning")}
                className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${scheduleFilter === "morning" ? "bg-primary text-background shadow-md" : "text-foreground/75 hover:text-foreground"}`}
              >
                Morning
              </button>
              <button 
                onClick={() => setScheduleFilter("afternoon")}
                className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${scheduleFilter === "afternoon" ? "bg-primary text-background shadow-md" : "text-foreground/75 hover:text-foreground"}`}
              >
                Afternoon
              </button>
            </div>

            {/* Timetable Items */}
            <div className="space-y-6">
              {filteredSchedule.map((item, idx) => (
                <div 
                  key={idx}
                  className={`glass-panel p-6 rounded-3xl border-l-4 ${item.category === "tracks" ? "border-l-secondary-container" : "border-l-primary"} hover:translate-x-1 transition-transform duration-200`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                    <span className="font-sora text-lg font-extrabold text-primary">{item.time}</span>
                    <span className={`inline-flex items-center self-start md:self-auto text-xs font-semibold uppercase px-3 py-1 rounded-full ${item.category === "tracks" ? "bg-secondary-container/10 text-secondary" : "bg-primary/5 text-primary"}`}>
                      {item.category === "tracks" ? "Interactive Workshops" : "General Assembly"}
                    </span>
                  </div>

                  <h3 className="font-sora text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="font-hanken text-sm text-foreground/80 mb-4 leading-relaxed">{item.description}</p>

                  {/* Render tracks options if it has split seminars */}
                  {item.tracks && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-outline-variant/10">
                      {item.tracks.map((track, tIdx) => (
                        <div key={tIdx} className="bg-surface-container-high/40 rounded-2xl p-4 border border-outline-variant/20">
                          <span className="text-[10px] font-extrabold uppercase text-secondary tracking-wide mb-1 block">{track.name}</span>
                          <h4 className="font-sora text-sm font-bold text-foreground mb-2">{track.title}</h4>
                          <span className="text-xs text-outline font-semibold">Speakers: {track.speakers}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render speaker note if present */}
                  {item.speaker && (
                    <div className="inline-flex items-center space-x-2 text-xs font-semibold text-outline">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <span>Led by {item.speaker}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Registration Section (Accessible mobile validation form) */}
        <section id="register" className="py-24 px-6 md:px-12 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-foreground mb-4">Register Now</h2>
            <p className="font-hanken text-foreground/75 text-lg">Secure your spot for the Creative Create Conference 2026. Fields marked with <span className="text-error font-bold">*</span> are required.</p>
          </div>

          <form 
            onSubmit={handleSubmit}
            className="glass-panel p-6 sm:p-10 rounded-3xl space-y-6 shadow-xl relative"
            noValidate
          >
            {/* Server feedback warnings */}
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
                    <option value="video">Video Production</option>
                    <option value="audio">Audio & Sound</option>
                    <option value="design">Graphic Design</option>
                    <option value="social">Social Media</option>
                    <option value="content">Content Strategy</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
                {formErrors.focus && (
                  <span id="focus-error" className="text-xs font-bold text-error mt-1">{formErrors.focus}</span>
                )}
              </div>
            </div>

            {/* Church / Organization */}
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

            {/* Register button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] text-background font-sora font-extrabold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-4 focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing Registration...</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>
          </form>
        </section>
      </main>

      {/* 6. Footer Component (Semantic, clean metadata links) */}
      <footer className="bg-surface-container border-t transition-colors duration-300 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 space-y-4">
            <span className="font-sora text-lg font-extrabold text-primary">CREATIVE CREATE</span>
            <p className="text-xs text-outline leading-relaxed max-w-xs">
              © 2026 Kingdom Creatives. All rights reserved. Equipping media ministries with structural creative energy.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Event Tracks</h4>
            <ul className="space-y-2 text-sm text-foreground/80 font-semibold">
              <li>Video Production</li>
              <li>Acoustic & Broadcast Audio</li>
              <li>Graphic Branding</li>
              <li>Social Media & Search Strategy</li>
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
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Support & Legal</h4>
            <ul className="space-y-2 text-sm text-foreground/80 font-semibold">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* 7. Dialog: Speaker Bio modal overlay (Mobile-first, fully responsive slide-sheet) */}
      {selectedSpeaker && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#06050c]/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedSpeaker(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            className="glass-panel w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header backdrop color */}
            <div className="h-28 bg-gradient-to-tr from-primary to-primary-container relative flex items-center px-8 border-b border-outline-variant/10">
              <button 
                onClick={() => setSelectedSpeaker(null)}
                className="absolute right-4 top-4 text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                aria-label="Close details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Profile Avatar overlay */}
            <div className="px-6 sm:px-8 pb-8 relative">
              <div className="w-20 h-20 rounded-2xl bg-surface border-4 border-surface shadow-md -mt-10 mb-4 flex items-center justify-center overflow-hidden">
                <span className="font-sora text-xl font-bold text-primary">
                  {selectedSpeaker.name.split(" ").map(n => n[0]).join("")}
                </span>
              </div>

              <h3 id="modal-title" className="font-sora text-2xl font-extrabold text-foreground mb-1">{selectedSpeaker.name}</h3>
              <span className="text-sm font-semibold text-primary block mb-6">{selectedSpeaker.role}</span>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-outline uppercase tracking-wider mb-1">About the Speaker</h4>
                  <p className="font-hanken text-sm text-foreground/90 leading-relaxed">{selectedSpeaker.bio}</p>
                </div>

                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 mt-4">
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">Assigned Track Session</h4>
                  <p className="font-sora text-sm font-bold text-foreground leading-snug">{selectedSpeaker.session}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedSpeaker(null)}
                className="w-full bg-primary-container hover:bg-primary/10 text-primary dark:text-foreground font-semibold py-3.5 px-6 rounded-2xl mt-6 transition-colors focus:outline-none focus:ring-4 focus:ring-primary/20"
              >
                Back to Speakers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Success Feedback Modal */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#06050c]/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSuccessModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated glowing success header */}
            <div className="h-32 bg-gradient-to-br from-primary to-primary-container relative flex items-center justify-center">
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center shadow-lg border-4 border-surface animate-bounce">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              <h3 className="font-sora text-2xl font-extrabold text-primary">Registration Saved!</h3>
              <p className="font-hanken text-sm text-foreground/80 leading-relaxed">
                Thank you for securing your spot at the **Creative Create Conference 2026**! Your information has been securely stored in our production database.
              </p>

              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 text-left mt-6">
                <div className="flex items-start space-x-3">
                  <span className="text-secondary shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wide">Next Action Steps</h4>
                    <p className="text-xs text-outline mt-1 font-semibold">Your ticket confirmation packet has been processed. We will email event itineraries, prep guidelines, and track details closer to July.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-primary text-background hover:bg-primary-hover font-semibold py-3.5 px-6 rounded-2xl mt-6 transition-all focus:outline-none focus:ring-4 focus:ring-primary/20"
              >
                Back to Conference Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
