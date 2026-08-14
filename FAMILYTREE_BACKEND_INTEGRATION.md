# Rithamic Family Tree – Backend API Integration Guide

> **Repository**: `rithamic-familytree`  
> **Backend Endpoint**: `http://localhost:3000` (or `https://api.rithamic.co.in`)  
> **Project Key**: `rithamic_familytree`  
> **Backend Design Spec**: Reference [`COMMON_METRICS_AND_OTP_PLAN.md`](file:///c:/Users/Gowtham/repos/rithamic-backend-api/COMMON_METRICS_AND_OTP_PLAN.md) in `rithamic-backend-api`.

---

## 1. Overview

The `rithamic-familytree` web application communicates directly with the centralized `rithamic-backend-api` for:
1. **Passwordless Secure OTP Login** (Email/SMS verification).
2. **Realtime Telemetry & Metrics** (Search queries, node clicks, tree views, PDF exports).
3. **Role-Based Privacy Enforcement** (Masking sensitive contact and birth info for regular family viewers vs. admins).

---

## 2. Authentication & OTP Flow

### Step 1: User Requests OTP
The user enters their registered family email or phone number on the login screen.

```javascript
// Frontend API Request
const response = await fetch('http://localhost:3000/api/auth/rithamic_familytree/otp/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipient: 'gowtham@example.com',
    channel: 'email'
  })
});

const data = await response.json();
// data: { success: true, message: "Verification code sent to gowtham@example.com", cooldownSeconds: 60 }
```

### Step 2: User Enters 6-Digit Code
The user enters the received 6-digit code.

```javascript
const response = await fetch('http://localhost:3000/api/auth/rithamic_familytree/otp/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipient: 'gowtham@example.com',
    otp: '849201'
  })
});

const { token, user } = await response.json();
// user: { id: 1, name: "Gowtham Thangamani", role: "admin", email: "..." }
// Store token in sessionStorage / secure cookie for authenticated sessions
```

---

## 3. Telemetry & Metrics Logging

Every interaction in the Family Tree is logged in the background through a non-blocking lightweight client helper.

```javascript
// Client-side Metrics Helper
function logFamilyTreeEvent(eventType, eventName, metadata = {}) {
  fetch('http://localhost:3000/api/metrics/rithamic_familytree/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType,
      eventName,
      sessionId: window.__sessionId,
      metadata
    })
  }).catch(() => {}); // non-blocking fallback
}

// 1. Log search queries
logFamilyTreeEvent('search_query', 'member_search', {
  query: 'Velusamy',
  resultsFound: 2
});

// 2. Log tree node clicks / focal center changes
logFamilyTreeEvent('interaction', 'node_focus', {
  personId: 6,
  personName: 'Velusamy Kounder',
  generation: 3
});

// 3. Log tree exports
logFamilyTreeEvent('export_action', 'tree_pdf_export', {
  branchId: 'BRANCH_VELUSAMY',
  format: 'pdf'
});
```

---

## 4. Privacy & Data Masking Logic

The frontend verifies the logged-in user role before rendering sensitive personal information:

```javascript
function getMemberDisplayProfile(person, currentUserRole) {
  // If viewing a deceased ancestor or user is an admin -> Full details
  if (!person.isLiving || currentUserRole === 'admin') {
    return {
      ...person,
      contacts: person.contacts,
      addresses: person.addresses,
      dob: person.dob
    };
  }

  // Regular logged-in family viewer -> Mask living sensitive details
  return {
    ...person,
    contacts: [], // Hidden
    addresses: person.addresses.map(a => ({ type: a.type, value: 'Kangayam, Tamil Nadu (Protected)' })),
    dob: person.dob ? `${person.dob.split('-')[0]} (Year Only)` : null
  };
}
```

---

## 5. Next Steps for Implementation

1. **Implement Backend Endpoints**: Build the shared `metrics` and `auth/otp` routes in `rithamic-backend-api`.
2. **Build Family Tree Frontend**: Develop the interactive visualization with search, focal node navigation, OTP login modal, and metrics tracking integration.
