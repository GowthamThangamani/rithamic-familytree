# Family Tree Web App – Plain English Project Guide

## 1. What Are We Building?

A private, secure website for our family where we can:
- **Build, view, and update** our complete family tree.
- **Search for any person instantly** and immediately know who they are without confusion.
- **See the entire lineage visually** on a clean, interactive tree chart.
- **Keep private information secure** so only authorized people see sensitive data.

---

## 2. Main Features

### A. Managing Family Members & Complex Relationships
- **Basic & Extended Info**: Add and manage names, dates of birth / passing, photos, contact details, native place, occupation, and personal notes.
- **Complex Family Connections**:
  - Support for **remarriages / multiple spouses** with chronological relationship tracking.
  - Support for **adoptions** (clearly distinguishing adoptive vs. biological ties).
  - Support for **traditional cross-relations / marriages within the family tree** without breaking the chart layout.
- **Full Control & Safety**: Add, edit, and safely remove members with dependency and safety checks so an entire branch is never accidentally orphaned or lost.

### B. Smart Quick Search (Zero Confusion)
- **Instant Search**: Type any name (e.g., *"Palanisamy"*) to get immediate matching suggestions.
- **Smart Identity Clues**: Since multiple relatives often share the exact same name, search results clearly show:
  - **Who their parents/spouse are** (e.g., *Palanisamy – S/o Ramasamy, H/o Lakshmi*).
  - **Their lifespan / age** (e.g., *1955 – 2020* or *Age 31*).
  - **Branch / Native Village**.
- **Jump to Tree**: Clicking the person immediately centers and highlights them on the interactive family tree chart.

### C. Visual Family Tree Chart
- **Interactive Map**: Smooth zoom in, zoom out, drag/pan navigation, and expand/collapse branch controls.
- **Focus View**: Click any person to set them as the focal center, revealing their parents/ancestors above them and children/descendants below them.
- **Works Everywhere**: Responsive design optimized for touchscreens, mobile phones, tablets, and desktop workstations.

### D. Security & Privacy Levels
- **Login Required**: The website is strictly private. Nobody can view any family information without an authenticated account.
- **Privacy by Role & Person**:
  - **Regular Viewers**: Can see names, family links, photos, and basic lineage. Sensitive info for living members (such as personal phone numbers, exact residential addresses, and full birth dates) stays protected and hidden.
  - **Editors / Admins**: Full access to view sensitive data and update/add records.
  - **Deceased Members**: Full historical details visible to all verified logged-in family members.

### E. Import, Export & Backups
- **Export Tree**: Download the family tree as a high-resolution PDF / Image (for framing, printing, or sharing) or as structured data backups (GEDCOM / Excel / JSON).
- **Import Data**: Ability to bulk-upload existing records and datasets to streamline initial setup without manual retyping.

### F. Tracking & Audit History
- **Activity & Movement Metrics**: Track key operational actions (who logged in, what was searched, tree node views) via our shared telemetry/metrics API.
- **Audit History (Behind the Scenes)**: Maintain a clear, tamper-resistant log of who created, edited, or deleted any record with timestamps to ensure historical accuracy.

---

## 3. System Architecture & Component Interaction

```text
[ Family Website (Frontend) ]
             │
             ├──► [ Dedicated Family Tree Backend API & Database ]
             │         (Manages members, relationships, privacy, & audit history)
             │
             └──► [ Common Metrics API ]
                       (Logs visits, searches, and movement events)
```
