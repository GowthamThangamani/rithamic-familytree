# Rithamic Family Tree - AI Agent Guidelines

All AI agents working on `rithamic-familytree` must follow these repository rules:

---

## 1. Project Identity & Positioning
* **Scope**: A private, secure lineage exploration and family tree portal for the Thangamani / Periya Pannai family (6 generations, 60 members).
* **Mode**: **Standalone Application** (`product_suite = NULL`).
  - No enterprise business links or factory ERP clutter.
  - Dedicated family theme with warm, rich, elegant aesthetics.

---

## 2. Authentication & Privacy Tiers
* **Central Auth Hub**: Connects to `rithamic-backend-api` using `project_key: "rithamic_familytree"`.
* **Public Tier (Default / Unauthenticated)**:
  - Browse full interactive family tree chart.
  - Search members and view biological / marital connections, birth years, and native towns.
  - Contact numbers, private notes, and home addresses are masked (e.g. `+91 94882 •••••`).
* **Protected Tier (Authenticated via OTP/JWT)**:
  - Entering OTP unlocks unmasked contact info, full dates, and editing capabilities for Admins.

---

## 3. Telemetry & Metrics
* All member searches and tree focus interactions stream non-blocking events to:
  `POST http://localhost:3000/api/metrics/rithamic_familytree/events`
