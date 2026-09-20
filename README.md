# Stravia Financial Consulting — Website

A responsive, static marketing website for **Stravia Financial Consulting Pvt. Ltd.** — an ownership-driven finance partner combining accounting, FP&amp;A, CFO advisory, financial modelling, automation and finance transformation.

Tagline: *Finance Beyond Numbers. Powered by Intelligence.*

## Pages
- **Home** (`index.html`) — video hero, growth challenge, BUILD→GROW framework, services snapshot, why Stravia, who we help
- **Services** (`services.html`) — six service lines with detailed capabilities + engagement models
- **Industries** (`industries.html`) — seven industries with challenges, how we help and key KPIs
- **Approach** (`approach.html`) — the ownership-driven process, the Stravia difference, value examples, insights
- **About** (`about.html`) — story, purpose, vision, values and founder profiles
- **Contact** (`contact.html`) — enquiry form (validation, country/phone sync, refreshable captcha)

## Tech
- Plain **HTML, CSS, JavaScript** — no build step, no framework
- `styles.css` — theme-driven via CSS variables; responsive via auto-fit grids
- `script.js` — reliable video playback, scroll reveals, rotating globe, footer world map and the contact-form logic
- `assets/` — images in **webp** + the hero video (all local)

## Colour themes
A theme switcher (top-right 🎨) lets you preview several palettes:
**Steel Blue** (recommended, default) · **Stravia Navy** (matches the logo) · Royal Blue · Deep Teal · Indigo · Slate Blue. The selection is remembered per browser.

## Run locally
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy
Hosted via **GitHub Pages** (main branch, root).

## Content status — awaiting from client
Marked **"not provided by client"** in the site where pending: business **email, phone, office address**, **social links**, the **co-founder** profile/photo, founder photo, and the **Privacy Policy** copy. The logo is currently a scalable SVG that adapts to the theme (drop in the exact brand file when ready).
