---
name: iam-design-system
description: Specialized guidelines and component workflows for crafting bespoke, editorial, high-aesthetic cybersecurity UI components in Aegis IAM.
---

# IAM Design System & Component Workflow

Use this skill whenever designing or modifying authenticated portal pages (`/dashboard`, `/users`, `/roles`, `/audit`, `/profile`, `/sdlc`).

## Component Guidelines

### 1. Header & Navigation Context
- Every page starts with a sub-label index tag (e.g. `01 · ARCHITECTURE & TELEMETRY`, `02 · DIRECTORY & ROLES`).
- Primary title in tight brutalist typography (`h1.sirnik-page-title` with `line-height: 0.95`).
- Real-time status chip with live telemetry dot (`SYSTEM HEALTHY`, `INTEGRITY VERIFIED`).

### 2. Metric Numerals
- High-impact oversized numerals (`sirnik-stat-num`) paired with index labels (`01 · DIRECTORY IDENTITIES`).
- Accent color coding:
  - Security Active: `#00FF66`
  - Warning/Critical: `#FF5A1F`
  - Bit/Crypto Strength: `#863bff` or `var(--accent)`

### 3. Data Tables & Lists
- Thin hairline grid dividers (`border: 1px solid var(--line)`).
- Monospaced badges for technical properties (`IP ADDRESS`, `SHA-256 HASH`, `JTI`).
- Action tags with distinct semantic color badges (`LOGIN` = green, `REVOKE` = red, `UPDATE` = orange, `VERIFY` = purple).

### 4. Interactive Modals & Drawers
- Deep backdrop blur (`backdrop-filter: blur(20px)`).
- Sharp border accents and smooth GSAP entrance easing.
