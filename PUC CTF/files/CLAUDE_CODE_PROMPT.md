# PUC IntraCTF 2026 — CTFd Theme Implementation
## Claude Code Prompt File

---

## YOUR TASK

Apply the "Zombie Outbreak Floor Escape" design system from the reference JSX dashboard
to a self-hosted CTFd instance. The goal is a complete, professional theme that looks
identical in spirit to the React dashboard — same fonts, same palette, same card style,
same challenge modal, same navbar — but implemented inside CTFd's Jinja2/CSS theming
architecture.

Do NOT modify CTFd's Python backend or database logic. Only touch:
- `CTFd/themes/pucctf/` (our custom theme directory)
- Static assets inside it (CSS, JS, images)
- Jinja2 templates inside it

---

## STEP 0 — UNDERSTAND THE CODEBASE FIRST

Before writing any code, run these commands and read the output carefully:

```bash
# Find CTFd installation root
find / -name "config.py" -path "*/CTFd/*" 2>/dev/null | head -5

# List existing themes to understand structure
ls CTFd/themes/

# Read the default theme's base template (the one we'll fork)
cat CTFd/themes/core/templates/base.html

# Read challenge card template
cat CTFd/themes/core/templates/challenges.html

# Read the navbar partial
find CTFd/themes/core/templates -name "navbar*" | xargs cat

# Find all CSS files in the default theme
find CTFd/themes/core/static -name "*.css" | head -20

# Read the main CSS
cat CTFd/themes/core/static/css/main.css 2>/dev/null || \
cat CTFd/themes/core/static/css/challenge-board.css 2>/dev/null

# Check CTFd version
cat CTFd/VERSION 2>/dev/null || grep -r "version" CTFd/config.py | head -3

# Check if CTFd uses Bootstrap and which version
grep -r "bootstrap" CTFd/themes/core/templates/base.html | head -5
```

After reading all the above, identify:
1. The exact Bootstrap version CTFd uses (likely 4.x or 5.x)
2. Where `{% block content %}` is defined in base.html
3. The exact Jinja variables available: `{{ ctf_name }}`, `{{ user }}`, `{{ score }}`, etc.
4. How challenge cards are rendered (template loop vs. JS fetch)

---

## STEP 1 — CREATE THE THEME DIRECTORY STRUCTURE

```bash
mkdir -p CTFd/themes/pucctf/templates/partials
mkdir -p CTFd/themes/pucctf/static/css
mkdir -p CTFd/themes/pucctf/static/js
mkdir -p CTFd/themes/pucctf/static/img
```

Then copy the default theme as a baseline to avoid rewriting everything:

```bash
cp -r CTFd/themes/core/templates/* CTFd/themes/pucctf/templates/
cp -r CTFd/themes/core/static/*    CTFd/themes/pucctf/static/
```

---

## STEP 2 — DESIGN TOKENS (Single Source of Truth)

Create `CTFd/themes/pucctf/static/css/tokens.css`:

```css
/* ============================================================
   PUC INTRACTF 2026 — DESIGN TOKENS
   Zombie Outbreak Floor Escape
   ============================================================ */

@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');

:root {
  /* --- PALETTE --- */
  --void:          #050507;
  --surface:       #0a0a0d;
  --card:          #0f0f13;
  --card-hover:    #141418;
  --border:        #1c1c24;
  --border-bright: #2a2a38;

  /* --- ACCENT COLORS --- */
  --red:           #d42222;
  --red-dim:       #8a1515;
  --red-glow:      rgba(212,34,34,0.15);
  --amber:         #e07c00;
  --amber-dim:     #7a4400;
  --teal:          #007a7a;
  --purple:        #6622bb;
  --blue:          #1155cc;

  /* --- TEXT --- */
  --text:          #c8c0b0;
  --text-dim:      #6a6478;
  --text-bright:   #e8e0d0;

  /* --- SOLVED STATE --- */
  --solved-bg:     #0d1a0d;
  --solved-border: #1a3a1a;
  --solved-text:   #2d6b2d;

  /* --- CATEGORY COLORS --- */
  --cat-osint:     #e07c00;
  --cat-forensics: #007a7a;
  --cat-crypto:    #8844dd;
  --cat-web:       #2277dd;
  --cat-misc:      #555570;
  --cat-pwn:       #cc3333;
  --cat-rev:       #2d9b6b;

  /* --- TYPOGRAPHY --- */
  --font-display:  'Bebas Neue', 'Impact', sans-serif;
  --font-mono:     'JetBrains Mono', 'Courier New', monospace;
  --font-body:     system-ui, -apple-system, 'Segoe UI', sans-serif;

  /* --- SPACING --- */
  --radius:        0px;   /* intentionally sharp — tactical aesthetic */
  --radius-sm:     2px;
}
```

---

## STEP 3 — GLOBAL STYLES

Create `CTFd/themes/pucctf/static/css/theme.css`:

```css
@import url('./tokens.css');

/* ── RESET & BASE ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }

html, body {
  background: var(--void) !important;
  color: var(--text) !important;
  font-family: var(--font-body);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Scanline overlay — CRT atmosphere */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px, transparent 2px,
    rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px
  );
}

/* Bootstrap overrides — nuke default white/light theme */
.bg-white, .bg-light { background: var(--card) !important; }
.text-dark           { color: var(--text) !important; }
.text-muted          { color: var(--text-dim) !important; }
.border              { border-color: var(--border) !important; }

a             { color: var(--red); text-decoration: none; }
a:hover       { color: var(--text-bright); }

/* Scrollbar */
::-webkit-scrollbar       { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--void); }
::-webkit-scrollbar-thumb { background: var(--border); }

/* Focus ring */
:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }

/* ── HAZARD BANNER ────────────────────────────────────────── */
.puc-hazard-banner {
  display: flex;
  align-items: stretch;
  background: #e8b800;
  position: relative;
  z-index: 1000;
  overflow: hidden;
}
.puc-hazard-stripe {
  width: 44px;
  flex-shrink: 0;
  background: repeating-linear-gradient(
    45deg, #111 0, #111 12px, #e8b800 12px, #e8b800 24px
  );
}
.puc-hazard-text {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 3px;
  color: #111;
  padding: 9px 18px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── NAVBAR ───────────────────────────────────────────────── */
.navbar, nav.navbar {
  background: rgba(5,5,7,0.98) !important;
  border-bottom: 1px solid var(--border) !important;
  height: 54px;
  padding: 0 24px !important;
  box-shadow: none !important;
}

/* Logo */
.navbar-brand {
  font-family: var(--font-display) !important;
  font-size: 24px !important;
  letter-spacing: 3px !important;
  color: var(--text-bright) !important;
  padding: 0 !important;
  line-height: 54px;
}
.navbar-brand .brand-puc { color: var(--red); }
.navbar-brand .brand-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 2px 6px;
  letter-spacing: 1px;
  margin-left: 8px;
  vertical-align: middle;
}

/* Nav links */
.navbar-nav .nav-link {
  font-family: var(--font-display) !important;
  font-size: 13px !important;
  letter-spacing: 2px !important;
  color: var(--text-dim) !important;
  padding: 0 16px !important;
  height: 54px;
  line-height: 54px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.navbar-nav .nav-link:hover,
.navbar-nav .nav-link.active,
.navbar-nav .nav-item.active .nav-link {
  color: var(--red) !important;
  border-bottom-color: var(--red);
}

/* Countdown timer in navbar */
#puc-nav-timer {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--red);
  border: 1px solid var(--red-dim);
  padding: 4px 10px;
  letter-spacing: 1px;
  background: rgba(212,34,34,0.08);
}

/* User avatar pill */
.navbar .user-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(212,34,34,0.12);
  border: 1px solid var(--red);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-size: 14px; color: var(--red);
  cursor: pointer;
}

/* ── HERO STRIP ───────────────────────────────────────────── */
.puc-hero {
  padding: 24px 24px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--void);
}
.puc-hero-eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--red);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.puc-hero-title {
  font-family: var(--font-display);
  font-size: 38px;
  letter-spacing: 4px;
  color: var(--text-bright);
  text-transform: uppercase;
  line-height: 1;
  margin: 0;
}
.puc-hero-title .accent { color: var(--red); }
.puc-hero-meta {
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 1px;
  display: flex;
  gap: 16px;
  align-items: center;
}
.puc-hero-meta .sep { color: var(--border); }
.puc-hero-meta .status-active { color: var(--amber); }

/* ── STAT ROW ─────────────────────────────────────────────── */
.puc-stats-row {
  display: flex;
  border-bottom: 1px solid var(--border);
}
.puc-stat {
  flex: 1;
  padding: 16px 24px;
  border-right: 1px solid var(--border);
}
.puc-stat:last-child { border-right: none; }
.puc-stat-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 3px;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 6px;
}
.puc-stat-val {
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 1;
  color: var(--text-bright);
  letter-spacing: 1px;
}
.puc-stat-val.accent { color: var(--red); }
.puc-stat-sub {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  margin-top: 3px;
}
.puc-stat-bar {
  height: 2px;
  background: var(--border);
  margin-top: 8px;
  border-radius: 1px;
  overflow: hidden;
}
.puc-stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--red-dim), var(--red));
  border-radius: 1px;
  transition: width 0.8s ease;
}

/* ── CHALLENGE BOARD LAYOUT ───────────────────────────────── */
.puc-board {
  display: grid;
  grid-template-columns: 1fr 270px;
  min-height: calc(100vh - 180px);
}
.puc-challenges-panel {
  padding: 18px 24px;
  border-right: 1px solid var(--border);
}
.puc-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.puc-panel-title {
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 3px;
  color: var(--text-dim);
}
.puc-panel-title::before {
  content: '▸ ';
  color: var(--red);
}

/* Search bar */
.puc-search-wrap {
  display: flex;
  align-items: center;
}
.puc-search-input {
  background: var(--void) !important;
  border: 1px solid var(--border) !important;
  border-right: none !important;
  color: var(--text) !important;
  font-family: var(--font-mono) !important;
  font-size: 11px !important;
  height: 32px;
  width: 200px;
  padding: 0 12px !important;
  outline: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.puc-search-input:focus {
  border-color: var(--red-dim) !important;
  box-shadow: none !important;
}
.puc-search-input::placeholder { color: var(--text-dim) !important; }
.puc-search-btn {
  width: 32px; height: 32px;
  background: var(--card);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-dim);
  font-size: 14px;
  cursor: pointer;
}

/* ── CATEGORY TABS (Floor tabs) ───────────────────────────── */
.puc-cat-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.puc-cat-tabs::-webkit-scrollbar { display: none; }
.puc-cat-tab {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--text-dim);
  padding: 8px 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
  text-transform: uppercase;
  user-select: none;
}
.puc-cat-tab:hover { color: var(--text-bright); }
.puc-cat-tab.active {
  color: var(--text-bright);
  border-bottom-color: var(--red);
  background: rgba(212,34,34,0.05);
}
.puc-cat-tab .tab-count { margin-left: 5px; color: var(--border-bright); }
.puc-cat-tab.active .tab-count { color: var(--red); }

/* ── CHALLENGE CARDS GRID ─────────────────────────────────── */
.puc-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* Individual challenge card */
.challenge-card, .puc-card {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-left: 3px solid var(--cat-misc) !important;
  border-radius: 0 !important;
  padding: 14px 14px 12px !important;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  color: var(--text) !important;
}

/* Per-category left border colors */
.challenge-card[data-category="OSINT"],
.puc-card.cat-osint      { border-left-color: var(--cat-osint) !important; }
.challenge-card[data-category="Forensics"],
.puc-card.cat-forensics  { border-left-color: var(--cat-forensics) !important; }
.challenge-card[data-category="Crypto"],
.puc-card.cat-crypto     { border-left-color: var(--cat-crypto) !important; }
.challenge-card[data-category="Web"],
.puc-card.cat-web        { border-left-color: var(--cat-web) !important; }
.challenge-card[data-category="Pwn"],
.puc-card.cat-pwn        { border-left-color: var(--cat-pwn) !important; }
.challenge-card[data-category="Rev"],
.puc-card.cat-rev        { border-left-color: var(--cat-rev) !important; }

/* Hover state */
.challenge-card:hover, .puc-card:hover {
  background: var(--card-hover) !important;
  border-color: var(--border-bright) !important;
}

/* Solved state */
.challenge-card.solved, .puc-card.solved {
  background: var(--solved-bg) !important;
  border-color: var(--solved-border) !important;
  border-left-color: var(--solved-text) !important;
}
.challenge-card.solved::after, .puc-card.solved::after {
  content: '✓';
  position: absolute; top: 8px; right: 10px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--solved-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--solved-text);
  font-weight: 700;
}

/* Card inner elements */
.puc-card-cat {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.puc-card-name {
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 1.5px;
  color: var(--text-bright);
  margin-bottom: 8px;
  line-height: 1.2;
}
.puc-card-pts {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  color: var(--red);
  line-height: 1;
}
.puc-card-solves {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  margin-top: 3px;
}
.puc-diff-pips {
  display: flex;
  gap: 3px;
  margin-top: 6px;
}
.puc-diff-pip {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.2s;
}
.puc-diff-pip.on {
  background: var(--red);
  box-shadow: 0 0 4px var(--red);
}

/* ── CHALLENGE MODAL ──────────────────────────────────────── */
/* Override CTFd's default modal with our design */
#challenge-window .modal-content,
.puc-modal-content {
  background: var(--card) !important;
  border: 1px solid rgba(212,34,34,0.27) !important;
  border-radius: 0 !important;
  color: var(--text) !important;
  box-shadow: 0 0 60px rgba(212,34,34,0.12), 0 0 0 1px rgba(212,34,34,0.14) !important;
  overflow: hidden;
}
#challenge-window .modal-content::before,
.puc-modal-content::before {
  content: '';
  display: block;
  height: 3px;
  background: var(--red);
  margin: 0;
}

/* Modal header */
#challenge-window .modal-header,
.puc-modal-header {
  background: var(--card) !important;
  border-bottom: 1px solid var(--border) !important;
  padding: 20px 22px 14px !important;
}
#challenge-window .modal-title,
.puc-modal-title {
  font-family: var(--font-display) !important;
  font-size: 22px !important;
  letter-spacing: 2px !important;
  color: var(--text-bright) !important;
  text-transform: uppercase;
}
.puc-modal-cat {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 3px;
  color: var(--red);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.puc-modal-pts {
  font-family: var(--font-display);
  font-size: 34px;
  color: var(--red);
  line-height: 1;
}
.puc-modal-pts-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

/* Modal body */
#challenge-window .modal-body,
.puc-modal-body {
  background: var(--card) !important;
  padding: 16px 22px !important;
}

/* Challenge description */
#challenge-window #challenge-description,
.puc-challenge-desc {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text-dim);
  line-height: 1.7;
  margin-bottom: 16px;
}

/* File download buttons */
#challenge-window .challenge-file-link,
.puc-file-btn {
  font-family: var(--font-mono) !important;
  font-size: 10px !important;
  color: var(--text-dim) !important;
  border: 1px solid var(--border) !important;
  padding: 4px 10px !important;
  background: transparent !important;
  border-radius: 0 !important;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 6px;
  margin-bottom: 6px;
  transition: all 0.15s;
}
#challenge-window .challenge-file-link:hover,
.puc-file-btn:hover {
  color: var(--text-bright) !important;
  border-color: var(--border-bright) !important;
}

/* Flag input */
#challenge-window #challenge-input,
.puc-flag-input {
  background: var(--void) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
  font-family: var(--font-mono) !important;
  font-size: 12px !important;
  padding: 10px 12px !important;
  outline: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  transition: border-color 0.15s;
}
#challenge-window #challenge-input:focus,
.puc-flag-input:focus {
  border-color: var(--red) !important;
  box-shadow: none !important;
}
#challenge-window #challenge-input::placeholder,
.puc-flag-input::placeholder { color: var(--border-bright) !important; }

/* Submit button */
#challenge-window #challenge-submit,
.puc-submit-btn {
  background: var(--red) !important;
  border: none !important;
  color: #fff !important;
  font-family: var(--font-display) !important;
  font-size: 14px !important;
  letter-spacing: 2px !important;
  padding: 10px 20px !important;
  border-radius: 0 !important;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
#challenge-window #challenge-submit:hover,
.puc-submit-btn:hover {
  background: var(--red-dim) !important;
}

/* Modal footer */
#challenge-window .modal-footer,
.puc-modal-footer {
  background: var(--card) !important;
  border-top: 1px solid var(--border) !important;
  padding: 10px 22px !important;
}

/* Close button */
#challenge-window .close, #challenge-window .btn-close {
  color: var(--text-dim) !important;
  opacity: 1;
  font-family: var(--font-mono);
  transition: color 0.15s;
}
#challenge-window .close:hover, #challenge-window .btn-close:hover {
  color: var(--red) !important;
}

/* Shake animation on wrong flag */
@keyframes puc-shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
.puc-shake { animation: puc-shake 0.4s ease; }

/* Success notification */
#challenge-window .alert-success, .puc-alert-success {
  background: var(--solved-bg) !important;
  border: 1px solid var(--solved-border) !important;
  color: var(--solved-text) !important;
  font-family: var(--font-mono) !important;
  font-size: 12px;
  border-radius: 0 !important;
}
#challenge-window .alert-danger, .puc-alert-danger {
  background: rgba(138,21,21,0.15) !important;
  border: 1px solid var(--red-dim) !important;
  color: var(--red) !important;
  font-family: var(--font-mono) !important;
  font-size: 12px;
  border-radius: 0 !important;
}

/* ── SIDEBAR ──────────────────────────────────────────────── */
.puc-sidebar {
  padding: 18px 16px;
  border-left: 1px solid var(--border);
  overflow-y: auto;
}
.puc-sidebar-section { margin-bottom: 24px; }
.puc-sidebar-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 3px;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

/* Leaderboard rows */
.puc-lb-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}
.puc-lb-rank {
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 700;
  color: var(--text-dim);
  width: 18px; text-align: right; flex-shrink: 0;
}
.puc-lb-rank.top { color: var(--red); }
.puc-lb-name {
  font-family: var(--font-display);
  font-size: 13px; letter-spacing: 1px;
  color: var(--text-dim);
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.puc-lb-name.me { color: var(--text-bright); }
.puc-lb-score {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  flex-shrink: 0;
}
.puc-lb-score.top { color: var(--red); }
.puc-lb-bar {
  height: 2px; background: var(--border); border-radius: 1px; margin-top: 3px;
}
.puc-lb-bar-fill {
  height: 100%; background: var(--red-dim); border-radius: 1px;
  transition: width 0.6s ease;
}
.puc-lb-bar-fill.me { background: var(--red); }

/* Scoreboard page table */
.puc-score-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 12px;
}
.puc-score-table th {
  color: var(--text-dim);
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-weight: 400;
}
.puc-score-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.puc-score-table tr:hover td { background: var(--card-hover); }
.puc-score-table .rank-1 td { color: var(--red); }

/* ── BUTTONS (generic CTFd buttons) ───────────────────────── */
.btn-primary, .btn-info {
  background: var(--red) !important;
  border-color: var(--red) !important;
  color: #fff !important;
  font-family: var(--font-display) !important;
  font-size: 13px !important;
  letter-spacing: 2px !important;
  border-radius: 0 !important;
  padding: 8px 18px !important;
  transition: background 0.15s !important;
}
.btn-primary:hover, .btn-info:hover {
  background: var(--red-dim) !important;
  border-color: var(--red-dim) !important;
}
.btn-secondary, .btn-outline-secondary {
  background: transparent !important;
  border: 1px solid var(--border) !important;
  color: var(--text-dim) !important;
  font-family: var(--font-display) !important;
  font-size: 13px !important;
  letter-spacing: 2px !important;
  border-radius: 0 !important;
  transition: all 0.15s !important;
}
.btn-secondary:hover, .btn-outline-secondary:hover {
  border-color: var(--border-bright) !important;
  color: var(--text-bright) !important;
}

/* ── FORMS ────────────────────────────────────────────────── */
.form-control, input, textarea, select {
  background: var(--void) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
  font-family: var(--font-mono) !important;
  font-size: 12px !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.form-control:focus, input:focus, textarea:focus, select:focus {
  border-color: var(--red) !important;
  box-shadow: none !important;
  color: var(--text-bright) !important;
}
.form-control::placeholder, input::placeholder { color: var(--border-bright) !important; }
label { color: var(--text-dim) !important; font-family: var(--font-mono) !important; font-size: 11px !important; letter-spacing: 1px; }

/* ── TABLES ───────────────────────────────────────────────── */
.table { color: var(--text) !important; }
.table-bordered { border-color: var(--border) !important; }
.table-bordered td, .table-bordered th { border-color: var(--border) !important; }
.table thead th {
  font-family: var(--font-mono) !important;
  font-size: 9px !important;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-dim) !important;
  border-bottom: 1px solid var(--border) !important;
  background: var(--void) !important;
  font-weight: 400 !important;
}
.table tbody tr { transition: background 0.12s; }
.table tbody tr:hover td { background: var(--card-hover) !important; }
.table tbody td { border-color: var(--border) !important; padding: 10px 12px !important; }

/* ── CARDS (Bootstrap generic) ────────────────────────────── */
.card {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: 0 !important;
  color: var(--text) !important;
}
.card-header {
  background: var(--void) !important;
  border-bottom: 1px solid var(--border) !important;
  font-family: var(--font-display) !important;
  font-size: 14px !important;
  letter-spacing: 2px;
  color: var(--text-dim) !important;
}

/* ── ALERTS ───────────────────────────────────────────────── */
.alert {
  border-radius: 0 !important;
  font-family: var(--font-mono) !important;
  font-size: 12px !important;
}
.alert-success { background: var(--solved-bg) !important; border-color: var(--solved-border) !important; color: var(--solved-text) !important; }
.alert-danger  { background: rgba(138,21,21,0.15) !important; border-color: var(--red-dim) !important; color: var(--red) !important; }
.alert-info    { background: rgba(17,85,204,0.12) !important; border-color: rgba(34,119,221,0.4) !important; color: #4488dd !important; }
.alert-warning { background: rgba(224,124,0,0.12) !important; border-color: var(--amber-dim) !important; color: var(--amber) !important; }

/* ── BADGES ───────────────────────────────────────────────── */
.badge {
  font-family: var(--font-mono) !important;
  font-size: 8px !important;
  letter-spacing: 2px;
  border-radius: 0 !important;
  padding: 3px 6px !important;
}
.badge-success, .bg-success { background: var(--solved-text) !important; }
.badge-danger,  .bg-danger  { background: var(--red-dim) !important; }
.badge-info,    .bg-info    { background: var(--blue) !important; }
.badge-warning, .bg-warning { background: var(--amber-dim) !important; }

/* ── PAGINATION ───────────────────────────────────────────── */
.page-item .page-link {
  background: var(--card) !important;
  border-color: var(--border) !important;
  color: var(--text-dim) !important;
  font-family: var(--font-mono) !important;
  font-size: 11px;
  border-radius: 0 !important;
  transition: all 0.15s;
}
.page-item .page-link:hover { background: var(--card-hover) !important; color: var(--red) !important; }
.page-item.active .page-link { background: var(--red) !important; border-color: var(--red) !important; color: #fff !important; }

/* ── FOOTER ───────────────────────────────────────────────── */
footer {
  background: var(--void) !important;
  border-top: 1px solid var(--border) !important;
  color: var(--text-dim) !important;
  font-family: var(--font-mono) !important;
  font-size: 10px !important;
  letter-spacing: 1px;
  padding: 16px 24px !important;
  text-align: center;
}

/* ── RESPONSIVE ───────────────────────────────────────────── */
@media (max-width: 992px) {
  .puc-board { grid-template-columns: 1fr; }
  .puc-sidebar { border-left: none; border-top: 1px solid var(--border); }
  .puc-cards-grid { grid-template-columns: repeat(2, 1fr); }
  .puc-hero-title { font-size: 26px; }
  .puc-stats-row { flex-wrap: wrap; }
  .puc-stat { min-width: 50%; }
}
@media (max-width: 576px) {
  .puc-cards-grid { grid-template-columns: 1fr; }
  .puc-stat { min-width: 100%; }
  .puc-hero-meta { flex-wrap: wrap; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
```

---

## STEP 4 — JAVASCRIPT ENHANCEMENTS

Create `CTFd/themes/pucctf/static/js/pucctf.js`:

```javascript
/* ============================================================
   PUC INTRACTF 2026 — Theme JS
   Zombie Outbreak Floor Escape
   ============================================================ */

'use strict';

// ── CATEGORY COLOR MAP ──────────────────────────────────────
const CAT_COLORS = {
  'osint':     '#e07c00',
  'forensics': '#007a7a',
  'crypto':    '#8844dd',
  'web':       '#2277dd',
  'misc':      '#555570',
  'pwn':       '#cc3333',
  'rev':       '#2d9b6b',
  'general':   '#555570',
};

function getCatColor(cat) {
  if (!cat) return CAT_COLORS['misc'];
  return CAT_COLORS[cat.toLowerCase()] || CAT_COLORS['misc'];
}

// ── HAZARD BANNER ───────────────────────────────────────────
function injectHazardBanner() {
  const banner = document.createElement('div');
  banner.className = 'puc-hazard-banner';
  banner.innerHTML = `
    <div class="puc-hazard-stripe"></div>
    <div class="puc-hazard-text">
      ⚠ PUC INTRACTF 2026 — ZOMBIE OUTBREAK FLOOR ESCAPE — CHALLENGE DASHBOARD ACTIVE
    </div>
    <div class="puc-hazard-stripe"></div>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
}

// ── COUNTDOWN TIMER ─────────────────────────────────────────
// Read CTF end time from a data attribute on <body> or a hidden element.
// Set data-ctf-end="<unix_timestamp_ms>" on body from Jinja2.
function initTimer() {
  const endTimeStr = document.body.dataset.ctfEnd;
  if (!endTimeStr) return;
  const endTime = parseInt(endTimeStr, 10);

  // Insert timer into navbar
  const navRight = document.querySelector('.navbar-nav + * , .navbar-collapse');
  if (!navRight) return;

  const timerEl = document.createElement('div');
  timerEl.id = 'puc-nav-timer';
  timerEl.style.cssText = 'margin-left:12px';
  navRight.appendChild(timerEl);

  function tick() {
    const remaining = Math.max(0, endTime - Date.now());
    if (remaining === 0) {
      timerEl.textContent = 'LOCKED';
      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    timerEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    setTimeout(tick, 1000);
  }
  tick();
}

// ── STYLE CHALLENGE CARDS ───────────────────────────────────
// CTFd renders cards server-side. We enhance them via JS after load.
function styleCards() {
  // CTFd 3.x challenge cards — look for data-challenge-id or class
  const cards = document.querySelectorAll(
    '.challenge-container, [data-challenge-id], .challenge-block, .card[data-cid]'
  );

  cards.forEach(card => {
    // Extract category from a badge, heading, or data attribute
    const catEl = card.querySelector('.badge, [class*="category"], .challenge-category');
    const catText = catEl ? catEl.textContent.trim() : '';
    const color = getCatColor(catText);

    card.style.setProperty('border-left', `3px solid ${color}`, 'important');
    card.style.setProperty('background', 'var(--card)', 'important');
    card.style.setProperty('border-radius', '0', 'important');

    // Solved indicator — CTFd adds a class like .solved or .challenge-solved
    if (card.classList.contains('solved') || card.querySelector('.challenge-solved, .already-solved')) {
      card.style.setProperty('background', 'var(--solved-bg)', 'important');
      card.style.setProperty('border-left-color', 'var(--solved-text)', 'important');
    }

    // Point value styling
    const pts = card.querySelector('.challenge-value, .points, [class*="value"]');
    if (pts) {
      pts.style.fontFamily = 'var(--font-mono)';
      pts.style.fontSize = '22px';
      pts.style.fontWeight = '700';
      pts.style.color = 'var(--red)';
    }

    // Category tag
    if (catEl) {
      catEl.style.fontFamily = 'var(--font-mono)';
      catEl.style.fontSize = '9px';
      catEl.style.letterSpacing = '2px';
      catEl.style.color = color;
      catEl.style.background = 'transparent';
      catEl.style.border = 'none';
      catEl.style.padding = '0';
    }

    // Challenge name
    const name = card.querySelector('.challenge-name, h3, h4, .card-title');
    if (name) {
      name.style.fontFamily = 'var(--font-display)';
      name.style.fontSize = '15px';
      name.style.letterSpacing = '1.5px';
      name.style.color = 'var(--text-bright)';
    }
  });
}

// ── STYLE THE MODAL ─────────────────────────────────────────
function watchModal() {
  // CTFd opens a modal when a card is clicked. Watch for it.
  const observer = new MutationObserver(() => {
    const modal = document.querySelector(
      '#challenge-window.show, #challenge-modal.show, .modal.show[id*="challenge"]'
    );
    if (!modal) return;

    // Apply category color to top border of modal
    const catEl = modal.querySelector('.badge, [class*="category"]');
    const catText = catEl ? catEl.textContent.trim() : '';
    const color = getCatColor(catText);
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.setProperty('border-color', `${color}44`, 'important');
      const topBar = content.querySelector('::before') || content;
      // Inject a colored top bar dynamically
      let bar = content.querySelector('.puc-modal-top-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'puc-modal-top-bar';
        bar.style.cssText = `height:3px; background:${color}; margin:0;`;
        content.insertBefore(bar, content.firstChild);
      } else {
        bar.style.background = color;
      }
    }

    // Style flag input placeholder
    const input = modal.querySelector('input[name="submission"], #challenge-input, input[type="text"]');
    if (input && !input.dataset.pucStyled) {
      input.placeholder = 'PUCTF{...}';
      input.dataset.pucStyled = '1';
      // Shake on wrong answer
      input.addEventListener('puc:wrong', () => {
        input.classList.add('puc-shake');
        setTimeout(() => input.classList.remove('puc-shake'), 500);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

// Trigger shake animation when submission fails
// CTFd fires a custom event or shows an alert — hook into both
function watchSubmission() {
  document.addEventListener('click', e => {
    if (!e.target.matches('#challenge-submit, [data-submit], #challenge-window .btn-primary')) return;
    const modal = document.querySelector('#challenge-window.show, .modal.show');
    if (!modal) return;
    // Small delay to let CTFd process the result
    setTimeout(() => {
      const alertDanger = modal.querySelector('.alert-danger');
      if (alertDanger) {
        const input = modal.querySelector('input[name="submission"], #challenge-input');
        if (input) input.dispatchEvent(new Event('puc:wrong'));
      }
    }, 400);
  });
}

// ── CATEGORY FILTER TABS ─────────────────────────────────────
// CTFd may use its own JS for category filtering.
// We style the existing filter buttons to match our tab design.
function styleFilterTabs() {
  const tabContainers = document.querySelectorAll(
    '#challenge-filters, .challenge-category-tabs, [id*="category-filter"]'
  );
  tabContainers.forEach(el => {
    el.classList.add('puc-cat-tabs');
    el.querySelectorAll('button, a, .filter-tab').forEach(btn => {
      btn.classList.add('puc-cat-tab');
    });
  });
}

// ── NAVBAR BRAND REWRITE ─────────────────────────────────────
function styleNavbar() {
  const brand = document.querySelector('.navbar-brand');
  if (brand) {
    const original = brand.textContent.trim();
    brand.innerHTML = `<span class="brand-puc">PUC</span> CTF <span class="brand-badge">2026</span>`;
  }
}

// ── SCOREBOARD TABLE ─────────────────────────────────────────
function styleScoreboard() {
  const tables = document.querySelectorAll('#scoreboard table, .score-graph + table, table.table');
  tables.forEach(t => t.classList.add('puc-score-table'));
}

// ── HERO INJECTION (challenges page only) ───────────────────
function injectHero() {
  if (!window.location.pathname.includes('/challenges')) return;
  const main = document.querySelector('main, #content, .container-fluid, .jumbotron');
  if (!main) return;

  const hero = document.createElement('div');
  hero.className = 'puc-hero';
  hero.innerHTML = `
    <div class="puc-hero-eyebrow">// PREMIER UNIVERSITY CHITTAGONG — HAZARI LANE CAMPUS</div>
    <h1 class="puc-hero-title">ZOMBIE OUTBREAK <span class="accent">—</span> FLOOR ESCAPE</h1>
    <div class="puc-hero-meta">
      <span>PUCTF{fl4g_h3r3}</span>
      <span class="sep">|</span>
      <span>15 CHALLENGES</span>
      <span class="sep">|</span>
      <span>5 FLOORS</span>
      <span class="sep">|</span>
      <span class="status-active">OUTBREAK STATUS: ACTIVE</span>
    </div>
  `;
  main.insertBefore(hero, main.firstChild);
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectHazardBanner();
  styleNavbar();
  initTimer();
  styleCards();
  watchModal();
  watchSubmission();
  styleFilterTabs();
  styleScoreboard();
  injectHero();

  // Re-run card styling after any dynamic content loads
  // (CTFd uses JS fetch for challenges in some versions)
  const cardObserver = new MutationObserver(() => {
    styleCards();
    styleFilterTabs();
  });
  const challengeGrid = document.querySelector('#challenge-board, #challenges, main');
  if (challengeGrid) {
    cardObserver.observe(challengeGrid, { childList: true, subtree: true });
  }
});
```

---

## STEP 5 — BASE TEMPLATE

Edit `CTFd/themes/pucctf/templates/base.html`.

Find the `<head>` section and add inside it (AFTER the existing CSS links):

```html
<!-- PUC CTF THEME FONTS & STYLES -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{ url_for('views.themes', path='static/css/tokens.css') }}">
<link rel="stylesheet" href="{{ url_for('views.themes', path='static/css/theme.css') }}">
```

Find the closing `</body>` tag and add before it:

```html
<!-- PUC CTF THEME JS -->
<!-- Pass CTF end time to JS via data attribute -->
<script>
  document.body.dataset.ctfEnd = "{{ ctf_end_time_ms | default(0) }}";
</script>
<script src="{{ url_for('views.themes', path='static/js/pucctf.js') }}"></script>
```

If `ctf_end_time_ms` is not an existing Jinja variable, replace it with the actual
variable CTFd uses for the end time. Check with:
```bash
grep -r "end" CTFd/themes/core/templates/ | grep "{{" | head -20
```

---

## STEP 6 — ACTIVATE THE THEME IN CTFd

There are two ways to activate a theme in CTFd:

### Option A — Admin Panel (easiest)
1. Start CTFd, go to `/admin/config`
2. Under "Theme" dropdown, select `pucctf`
3. Save

### Option B — Direct database update
```bash
# Only if Option A is unavailable
python3 -c "
import sys; sys.path.insert(0, '.')
from CTFd import create_app
from CTFd.models import db, Configs

app = create_app()
with app.app_context():
    c = Configs.query.filter_by(key='ctf_theme').first()
    if c:
        c.value = 'pucctf'
    else:
        db.session.add(Configs(key='ctf_theme', value='pucctf'))
    db.session.commit()
    print('Theme set to pucctf')
"
```

### Option C — Config file
If CTFd uses a `config.ini` or `.env`:
```bash
grep -r "theme" CTFd/config.py CTFd/.env* 2>/dev/null
# Set CTF_THEME=pucctf in the relevant config
```

---

## STEP 7 — VERIFY & FIX

After activating the theme, open the site and run these checks:

```bash
# Restart CTFd to pick up the new theme
# (method depends on deployment)
docker restart ctfd   # if Docker
# or:
pkill -f "python.*CTFd" && python3 serve.py &
```

Open browser DevTools → Console and check for 404s on our CSS/JS files.
If any 404s appear, the static file path is wrong. Fix with:

```bash
# Find the correct static URL pattern CTFd uses
grep -r "url_for.*themes" CTFd/themes/core/templates/ | head -10
# Use whatever pattern you find there verbatim in base.html
```

Open browser DevTools → Elements and verify:
1. `body` has `background: #050507`
2. `.navbar` has `background: rgba(5,5,7,0.98)`
3. Challenge cards have `border-left: 3px solid <category color>`
4. The font-family on `.navbar-brand` is `Bebas Neue`

---

## STEP 8 — CUSTOM CHALLENGE VIEW (Optional but recommended)

If CTFd's challenge board is rendered via JavaScript (CTFd 3.x uses React-like JS),
you may need to override `CTFd/themes/pucctf/templates/challenges.html` more deeply.

Check which approach CTFd uses:
```bash
grep -r "fetch\|axios\|XMLHttpRequest\|api/v1/challenges" CTFd/themes/core/static/js/ | head -10
```

If it uses the API, the cards are rendered client-side. In that case:
1. Read `CTFd/themes/core/static/js/challenges.js` (or similar)
2. Copy it to `CTFd/themes/pucctf/static/js/challenges.js`
3. Find the card render function (look for `createElement` or template literals)
4. Replace the card HTML with our design, applying `puc-card`, `puc-card-cat`,
   `puc-card-name`, `puc-card-pts` classes

---

## IMPORTANT CONSTRAINTS

- Do NOT edit any Python files in `CTFd/` (only theme files)
- Do NOT touch `CTFd/themes/core/` — only `CTFd/themes/pucctf/`
- Do NOT break CTFd's JS flag submission logic — only add classes/styles on top
- All color values must come from CSS custom properties defined in `tokens.css`
- If CTFd uses Bootstrap 5 (check for `bs5` in class names), some selector names differ:
  - Bootstrap 4: `.close` button → Bootstrap 5: `.btn-close`
  - Bootstrap 4: `data-toggle` → Bootstrap 5: `data-bs-toggle`
  - Adjust selectors in `theme.css` accordingly

---

## FILE SUMMARY

When done, you should have created:
```
CTFd/themes/pucctf/
├── static/
│   ├── css/
│   │   ├── tokens.css      ← design tokens (single source of truth)
│   │   └── theme.css       ← all component overrides
│   ├── js/
│   │   └── pucctf.js       ← card styling, modal hooks, timer, banner
│   └── img/                ← (empty, add favicon here if needed)
└── templates/
    ├── base.html            ← forked from core, with our CSS/JS injected
    └── (all other templates copied from core)
```

That's it. The theme is additive — it layers on top of CTFd's existing structure
rather than replacing it, so CTFd updates won't break core functionality.
