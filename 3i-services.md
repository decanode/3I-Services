# 3i Services CRM — Complete Application Documentation

```
VERSION: 1.2
LAST_UPDATED: 2026-04-16
PURPOSE: Human-readable and AI-parseable reference for all function flows,
         data models, API endpoints, security rules, and frontend interactions.

AI_PARSING_NOTES:
  - Every function is annotated with FUNCTION:, CALLS:, RETURNS:, SIDE_EFFECTS:,
    and GUARD_CONDITIONS: labels.
  - Firestore collection names are always quoted exactly as they appear in code.
  - ledger_id derivation rule: ledger.trim().replace(/\s+/g, '').toUpperCase()
  - City values are stored as lowercase strings.
  - All dates in API payloads use YYYY-MM-DD unless noted.
  - Timestamps in Firestore are Firebase Timestamp objects (server time).
```

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Backend — Architecture](#4-backend--architecture)
5. [Backend — Middleware](#5-backend--middleware)
   - [5.1 auth.js](#51-authjsverify-jwt)
   - [5.2 admin.js](#52-adminjsrequire-admin)
6. [Backend — API Endpoints](#6-backend--api-endpoints)
   - [6.1 Auth /api/auth](#61-auth--apiauth)
   - [6.2 Signup /api/signup](#62-signup--apisignup)
   - [6.3 Password /api/password](#63-password--apipassword)
   - [6.4 User /api/user](#64-user--apiuser)
   - [6.5 Excel /api/excel](#65-excel--apiexcel)
   - [6.6 Ledger Remainder /api/ledger-remainder](#66-ledger-remainder--apiledger-remainder)
   - [6.7 Ledger Logs /api/ledger-logs](#67-ledger-logs--apiledger-logs)
   - [6.8 Admin Dashboard /api/admin](#68-admin-dashboard--apiadmin)
   - [6.9 Seeder /api/seed](#69-seeder--apiseed)
   - [6.10 Counter /api/counter](#610-counter--apicounter)
   - [6.11 System /health](#611-system-endpoints)
7. [Backend — Services](#7-backend--services)
   - [7.1 user.js](#71-userjs)
   - [7.2 registration.js](#72-registrationjs)
   - [7.3 excelMaster.js](#73-excelmasterjs)
   - [7.4 ledgerRemainder.js](#74-ledgerremainderjs)
   - [7.5 ledgerLogs.js](#75-ledgerlogsjs)
   - [7.6 outstanding.js](#76-outstandingjs)
   - [7.7 activity.js](#77-activityjs)
   - [7.8 otp.js](#78-otpjs)
   - [7.9 counter.js](#79-counterjs)
8. [Backend — Utilities](#8-backend--utilities)
   - [8.1 jwt.js](#81-jwtjs)
   - [8.2 mailer.js](#82-mailerjs)
   - [8.3 generator.js](#83-generatorjs)
   - [8.4 excelParser.js](#84-excelparserjs)
   - [8.5 outstandingParser.js](#85-outstandingparserjs)
   - [8.6 customerValidator.js](#86-customervalidatorjs)
   - [8.7 sessionCache.js](#87-sessioncachejs)
9. [Database — Firestore Collections](#9-database--firestore-collections)
10. [Frontend — Architecture](#10-frontend--architecture)
11. [Frontend — Routes & Pages](#11-frontend--routes--pages)
    - [11.1 /login](#111-login--loginjsx)
    - [11.2 /home](#112-home--homejsx)
    - [11.3 /view](#113-view--viewjsx)
    - [11.4 /view-master](#114-view-master--view-masterjsx)
    - [11.5 /view-outstandings](#115-view-outstandings--view-outstandingsjsx)
    - [11.6 /view-log](#116-view-log--view-logjsx)
    - [11.7 /notify](#117-notify--view-notifyjsx)
    - [11.8 /view-notify-detail](#118-view-notify-detail--view-notify-detailjsx)
    - [11.9 /excel](#119-excel--exceljsx)
    - [11.10 /profile](#1110-profile--userprofilejsx)
12. [Frontend — Components](#12-frontend--components)
13. [Security Model](#13-security-model)
14. [End-to-End Data Flows](#14-end-to-end-data-flows)
    - [Flow 1: User Registration → Approval → First Login](#flow-1-user-registration--admin-approval--first-login)
    - [Flow 2: Excel Master Upload → Ledger Seeding](#flow-2-excel-master-upload--ledger-seeding)
    - [Flow 3: Outstanding Upload → Balance Update → Audit Log](#flow-3-outstanding-upload--balance-update--audit-log)
    - [Flow 4: Ledger Remainder Update → Call Scheduling](#flow-4-ledger-remainder-update--call-scheduling)
    - [Flow 5: Password Reset via OTP](#flow-5-password-reset-via-otp)
    - [Flow 6: Admin Dashboard Load](#flow-6-admin-dashboard-load)
    - [Flow 7: Export Ledger Logs to Excel](#flow-7-export-ledger-logs-to-excel)
15. [Deployment](#15-deployment)
16. [Error Code Reference](#16-error-code-reference)

---

## 1. Application Overview

**3i Services CRM** is an internal Customer Relationship Management tool for 3i Services — a company that manages financial accounts (ledgers) across multiple cities. Employees track outstanding debit/credit amounts per ledger, schedule follow-up call dates, and record comments. Admins manage the user base and upload financial data from Excel files.

### Business Domain

- **Ledger**: A client/account tracked by a unique `ledger_id` (derived from the ledger name).
- **Outstanding**: The current debit (amount owed to 3i) and credit (amount owed by 3i) balances for each ledger.
- **Remainder**: A record that combines outstanding balance data with call scheduling (nextCallDate) and contact information.
- **Audit Log**: Every change to outstanding amounts or call dates is logged in `Ledger_logs`.

### User Roles

| Role | Cities | Permissions |
|---|---|---|
| `admin` | All cities | Full CRUD on all resources, user management, Excel uploads |
| `employee` | Own city only | View and update remainders for their city, cannot manage users or upload Excel |

### Core Data Lifecycle

```
Excel Master Upload
      ↓
Excel_master collection (ledger metadata: name, city, group, contact info, bank details)
      ↓ (auto-populated on master upload)
Outstanding_Remainder collection (ledger + balance tracking + call scheduling)
      ↓
Outstanding Upload (updates debit/credit values)
      ↓
Ledger_logs collection (audit trail of every change)
      ↓
Employee updates nextCallDate/comments via UI
      ↓
Ledger_logs updated (logs date/comment changes too)
```

### Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Backend Runtime | Node.js | 20+ | Server runtime |
| Backend Framework | Express.js | 4.x | HTTP server, routing |
| Auth Store | Firebase Auth | Admin SDK | User accounts, password hashing |
| Database | Firestore | Admin SDK | All application data |
| Email | Nodemailer + Gmail SMTP | — | OTP, credentials, admin alerts |
| Session | JWT + in-memory cache | jsonwebtoken | Stateful-ish sessions via HttpOnly cookie |
| Frontend Framework | React | 18.x | UI |
| Frontend Build | Vite | 5.x | Bundler, dev server |
| Frontend Routing | React Router DOM | v6 | SPA routing |
| Frontend Styling | TailwindCSS | 3.x | Utility-first CSS |
| Frontend Icons | Lucide React | — | Icon library |
| Frontend Animation | GSAP | — | Carousel/hero animations |
| Deployment | Firebase App Hosting | — | Cloud Run-based hosting |

---

## 2. Project Structure

```
3I-Services-DEV/
├── apphosting.yaml          # Firebase App Hosting deploy config
├── firebase.json            # Firebase CLI config
├── .firebaserc              # Firebase project alias (i-services-crm)
├── package.json             # Monorepo root scripts
│
├── backend/
│   ├── server.js            # ENTRY POINT — Express app, middleware, route mounting
│   ├── package.json
│   ├── .env                 # Dev environment variables (never committed)
│   │
│   ├── config/
│   │   └── firebase.js      # Firebase Admin SDK init, Firestore client export
│   │
│   ├── routes/              # Express Router definitions (thin — delegate to controllers)
│   │   ├── auth.js
│   │   ├── signup.js
│   │   ├── password.js
│   │   ├── user.js
│   │   ├── excelMaster.js
│   │   ├── ledgerRemainder.js
│   │   ├── ledgerLogs.js
│   │   ├── adminDashboard.js
│   │   ├── counter.js
│   │   └── seeder.js
│   │
│   ├── controllers/         # Request/response handling, validation, orchestration
│   │   ├── auth.js
│   │   ├── signup.js
│   │   ├── password.js
│   │   ├── user.js
│   │   ├── excelMaster.js
│   │   ├── ledgerRemainder.js
│   │   ├── ledgerLogs.js
│   │   ├── adminDashboard.js
│   │   ├── counter.js
│   │   └── seeder.js
│   │
│   ├── services/            # Business logic, Firestore operations
│   │   ├── user.js
│   │   ├── registration.js
│   │   ├── excelMaster.js
│   │   ├── ledgerRemainder.js
│   │   ├── ledgerLogs.js
│   │   ├── outstanding.js
│   │   ├── activity.js
│   │   ├── counter.js
│   │   └── otp.js
│   │
│   ├── middleware/
│   │   ├── auth.js          # JWT verification + session cache check
│   │   └── admin.js         # Role guard (admin only)
│   │
│   ├── models/              # Field definitions and normalization rules
│   │   ├── user.js
│   │   ├── request.js
│   │   ├── excelMaster.js
│   │   ├── ledgerRemainder.js
│   │   ├── ledgerLogs.js
│   │   ├── counter.js
│   │   └── outstanding.js
│   │
│   └── utils/
│       ├── jwt.js
│       ├── mailer.js
│       ├── generator.js
│       ├── excelParser.js
│       ├── outstandingParser.js
│       ├── customerValidator.js
│       └── sessionCache.js
│
└── frontend/
    ├── index.html
    ├── main.jsx             # React root mount
    ├── app.jsx              # Router setup, route definitions, auth guards
    ├── vite.config.js       # Vite config, /api proxy to backend:6000
    ├── tailwind.config.js
    ├── package.json
    │
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx  # Global auth state provider
    │   │
    │   ├── utils/
    │   │   └── api.js           # apiFetch wrapper, apiUrl helper
    │   │
    │   ├── pages/
    │   │   ├── login.jsx
    │   │   ├── home.jsx
    │   │   ├── view.jsx
    │   │   ├── view-master.jsx
    │   │   ├── view-outstandings.jsx
    │   │   ├── view-log.jsx
    │   │   ├── view-notify.jsx
    │   │   ├── view-notify-detail.jsx
    │   │   ├── excel.jsx
    │   │   └── Remainder.jsx    # Dashboard widget (used inside home.jsx)
    │   │
    │   ├── components/
    │   │   ├── Alert.jsx
    │   │   ├── Button.jsx
    │   │   ├── datepicker.jsx
    │   │   ├── Table.jsx
    │   │   ├── sidebar.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── loader.jsx
    │   │   ├── loading.jsx
    │   │   └── userprofile.jsx
    │   │
    │   └── styles/
    │       ├── pagestyles/      # Per-page CSS
    │       └── componentstyles/ # Per-component CSS
    │
    └── dist/                # Vite build output (served by backend in production)
```

---

## 3. Environment Variables

### Backend (.env / Cloud Secret Manager)

| Variable | Dev Default | Prod Source | Required | Purpose |
|---|---|---|---|---|
| `PORT` | `6000` | `8080` (hardcoded in apphosting) | Yes | HTTP server port |
| `NODE_ENV` | `development` | `production` | Yes | Environment flag |
| `JWT_SECRET` | `dmekwncj43fcwccdsj` | Secret Manager: JWT_SECRET_DEV | Yes | JWT signing key |
| `JWT_EXPIRES_IN` | `60m` | `60m` | Yes | JWT token lifetime |
| `FIREBASE_API_KEY` | Firebase public key | Secret Manager | Yes | Firebase REST API (password verify) |
| `FIRESTORE_DB_ID` | `development` | `development` or `production` | Yes | Firestore database ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | path to serviceAccountKey.json | App Default (Cloud Run) | Yes* | Firebase Admin auth |
| `EMAIL_USER` | `decanode10@gmail.com` | Secret Manager: EMAIL_USER_DEV | Yes | Gmail SMTP sender address |
| `EMAIL_PASSWORD` | App password | Secret Manager: EMAIL_PASSWORD_DEV | Yes | Gmail app password |
| `EMAIL_SERVICE` | `gmail` | `gmail` | Yes | Nodemailer transport service |
| `OTP_VALID_TIME` | `120` | `120` | Yes | OTP expiry in seconds |
| `OTP_RESEND_TIME` | `60` | `60` | Yes | OTP resend cooldown in seconds |
| `CORS_ORIGIN` | `http://localhost:3000` | Production frontend URL | Yes | Allowed CORS origin |
| `ADMIN_FIRSTNAME` | — | — | Seeder only | Admin first name for seeder |
| `ADMIN_LASTNAME` | — | — | Seeder only | Admin last name |
| `ADMIN_FATHERNAME` | — | — | Seeder only | Admin father name |
| `ADMIN_DOB` | — | — | Seeder only | Admin DOB (YYYY-MM-DD) |
| `ADMIN_NUMBER` | — | — | Seeder only | Admin phone number |
| `ADMIN_COUNTRY_CODE` | — | — | Seeder only | Admin country code (e.g. +91) |

### Frontend (.env / Vite)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `` (empty, uses Vite proxy) | Backend API base URL |

> In development, Vite proxies `/api` → `http://localhost:6000`. In production, frontend and backend share the same origin so no proxy needed.

---

## 4. Backend — Architecture

### Request Lifecycle

```
HTTP Request
  ↓
Express CORS middleware (checks Origin against CORS_ORIGIN, allows credentials)
  ↓
express.json() body parser
  ↓
cookie-parser (parses token cookie)
  ↓
Route match
  ↓
[Optional] auth.js middleware  → verifies JWT + session cache → attaches req.user
  ↓
[Optional] admin.js middleware → checks req.user.role === 'admin'
  ↓
Controller function (validates input, orchestrates)
  ↓
Service function(s) (Firestore reads/writes, business logic)
  ↓
HTTP Response (JSON)
```

### server.js Key Behaviors

```
PORT: process.env.PORT || 6000
Static files: /frontend/dist (served in production)
Health: GET /health → { status: 'ok', timestamp }
SPA fallback: GET * → index.html (for any non-API route)

Route mounts:
  /api/auth           → routes/auth.js
  /api/signup         → routes/signup.js
  /api/password       → routes/password.js
  /api/user           → routes/user.js
  /api/excel          → routes/excelMaster.js
  /api/ledger-remainder → routes/ledgerRemainder.js
  /api/ledger-logs    → routes/ledgerLogs.js
  /api/counter        → routes/counter.js
  /api/admin          → routes/adminDashboard.js
  /api/seed           → routes/seeder.js
```

### Firebase Config (backend/config/firebase.js)

```
Initializes Firebase Admin SDK.
Credential source:
  - If GOOGLE_APPLICATION_CREDENTIALS set → reads serviceAccountKey.json
  - Else → Application Default Credentials (Cloud Run managed identity)
Firestore DB: determined by FIRESTORE_DB_ID env var
Exports: { admin, db, auth }
```

---

## 5. Backend — Middleware

### 5.1 auth.js — Verify JWT

**File:** `backend/middleware/auth.js`

```
FUNCTION: verifyJwt(req, res, next)
CALLS:
  - jwt.verifyToken(token)        → decodes payload
  - sessionCache.getSession(userId) → retrieves cached token
GUARD_CONDITIONS:
  - No token cookie present          → 401 { error: 'No token provided' }
  - jwt.verifyToken throws           → 401 { error: 'Invalid or expired token' }
  - No session in cache              → 401 { error: 'Session not found. Please log in again.' }
  - Token !== cached session token   → 401 { error: 'Session superseded. Please log in again.' }
SIDE_EFFECTS:
  - Attaches req.user = { userId, email, role, firstName, city, iat }
  - Calls next() on success
RETURNS: void (calls next or sends 401 response)
```

### 5.2 admin.js — Require Admin

**File:** `backend/middleware/admin.js`

```
FUNCTION: requireAdmin(req, res, next)
GUARD_CONDITIONS:
  - req.user.role !== 'admin' → 403 { error: 'Access denied. Admin only.' }
SIDE_EFFECTS:
  - Calls next() on success
RETURNS: void (calls next or sends 403 response)
NOTE: Must be used AFTER auth.js middleware (requires req.user to be set)
```

---

## 6. Backend — API Endpoints

### 6.1 Auth — /api/auth

**Files:** `backend/routes/auth.js` → `backend/controllers/auth.js`

---

#### POST /api/auth/login

```
AUTH: None (public)
REQUEST BODY: { userId: string, password: string }
```

```
CALL CHAIN:
  controller.login
    → userService.findByUserId(userId)        [reads 'users' collection]
    → Firebase REST API: verifyPassword(email, password)
    → jwt.generateToken(userId, email, role, firstName, city)
    → sessionCache.setSession(userId, token)
    → activityService.recordLogin(userId)     [writes 'loginActivities']
    → res.cookie('token', token, { httpOnly, secure, sameSite:'strict', maxAge })
SIDE_EFFECTS:
  - Sets HttpOnly cookie named 'token'
  - Creates login record in 'loginActivities' collection
  - Overwrites any previous session in sessionCache
RESPONSE (200):
  {
    message: "Login successful",
    user: { userId, email, firstName, lastName, role, city }
  }
ERRORS:
  400 — missing userId or password
  401 — user not found
  401 — wrong password (Firebase REST returns invalid credential)
  500 — Firestore or Firebase error
```

---

#### POST /api/auth/logout

```
AUTH: Required (any role)
REQUEST BODY: none
CALL CHAIN:
  controller.logout
    → sessionCache.deleteSession(req.user.userId)
    → res.clearCookie('token')
SIDE_EFFECTS:
  - Removes session from sessionCache
  - Clears 'token' cookie on client
RESPONSE (200): { message: "Logged out successfully" }
ERRORS:
  401 — not authenticated
```

---

#### GET /api/auth/sessions/:userId

```
AUTH: Required (any role)
PARAMS: userId (string)
CALL CHAIN:
  controller.getSessions
    → activityService.getLastLogin(userId)   [reads 'loginActivities']
RESPONSE (200):
  {
    userId: string,
    lastLogin: { timestamp: Timestamp, date: "DD/MM/YYYY", time: "HH:MM AM/PM" } | null
  }
ERRORS:
  401 — not authenticated
  500 — Firestore error
```

---

### 6.2 Signup — /api/signup

**Files:** `backend/routes/signup.js` → `backend/controllers/signup.js`

---

#### POST /api/signup/register

```
AUTH: None (public)
REQUEST BODY:
  {
    firstName: string,
    lastName: string,
    fatherName: string,
    dob: string (YYYY-MM-DD),
    email: string,
    phone: string (10 digits, optional),
    city: string
  }
VALIDATION:
  - phone: exactly 10 digits if provided
  - Duplicate check: phone in 'requests' (pending) + 'users'
  - Duplicate check: email in 'requests' (pending/approved) → 409
CALL CHAIN:
  controller.register
    → registrationService.findByPhone(phone)   [reads 'requests']
    → userService.findByPhone(phone)           [reads 'users']
    → registrationService.findByEmail(email)   [reads 'requests']
    → userService.findByEmail(email)           [reads 'users']
    → registrationService.createRequest(data)  [writes 'requests' with status='pending']
    → mailer.sendEmailToAdmin(...)             [fire-and-forget, no await on error]
RESPONSE (201):
  { message: "Registration request submitted successfully.", requestId: string }
ERRORS:
  400 — missing required fields, invalid phone format
  409 — phone/email already used or pending
  500 — Firestore error
```

---

#### GET /api/signup/pending

```
AUTH: Required | ROLE: admin
CALL CHAIN:
  controller.getPendingRequests
    → registrationService.getPendingRequests()   [reads 'requests' where status='pending']
RESPONSE (200): { requests: [ {id, firstName, lastName, email, phone, city, createdAt}, ... ] }
```

---

#### GET /api/signup/requests

```
AUTH: Required | ROLE: admin
CALL CHAIN:
  controller.getAllRequests
    → registrationService.getAllRequests()   [reads all 'requests']
RESPONSE (200): { requests: [...] }
```

---

#### PUT /api/signup/approve/:id

```
AUTH: Required | ROLE: admin
PARAMS: id (Firestore document ID of the request)
CALL CHAIN:
  controller.approveRequest
    → registrationService.findById(id)             [reads 'requests']
    → generator.generateCredentials(firstName, fatherName, dob)
        → userId = firstName.toLowerCase() + DDMM(dob)
        → password = first4(fatherName).toLowerCase() + '#' + DD(dob)
    → Firebase Auth: createUser({ email, password, displayName })
    → userService.createUser({ ...requestData, userId, role:'employee' })  [writes 'users']
    → registrationService.deleteRequest(id)        [deletes from 'requests']
    → mailer.sendCredentialsEmail({ email, firstName, userId, password })  [fire-and-forget]
SIDE_EFFECTS:
  - Creates Firebase Auth user
  - Creates user document in 'users' collection
  - Deletes request document from 'requests'
  - Sends credentials email to new employee
RESPONSE (200): { message: "User approved and credentials sent.", userId: string }
ERRORS:
  404 — request not found
  400 — request not in pending status
  409 — Firebase Auth email already exists
  500 — Firebase or Firestore error
```

---

#### PUT /api/signup/reject/:id

```
AUTH: Required | ROLE: admin
PARAMS: id (Firestore document ID)
CALL CHAIN:
  controller.rejectRequest
    → registrationService.updateStatus(id, 'rejected')  [updates 'requests']
RESPONSE (200): { message: "Request rejected." }
ERRORS:
  404 — request not found
```

---

### 6.3 Password — /api/password

**Files:** `backend/routes/password.js` → `backend/controllers/password.js`

---

#### POST /api/password/send-otp

```
AUTH: None (public)
REQUEST BODY: { email: string }
CALL CHAIN:
  controller.sendOtp
    → userService.findByEmail(email)            [reads 'users']
    → otpService.findMostRecent(email)          [reads 'otps']
      → checks resend cooldown (OTP_RESEND_TIME seconds)
    → generate 6-digit random OTP
    → otpService.create(email, otp)             [writes 'otps', deletes old OTP first]
    → mailer.sendOtpEmail({ email, firstName, otp })  [fire-and-forget]
RESPONSE (200):
  {
    success: true,
    message: "OTP sent to email.",
    otpExpirationSeconds: 120,
    resendOtpSeconds: 60
  }
ERRORS:
  400 — missing email
  404 — email not registered
  429 — resend cooldown active { secondsRemaining }
  500 — Firestore or email error
```

---

#### POST /api/password/resend-otp

```
AUTH: None (public)
REQUEST BODY: { email: string }
BEHAVIOR: Same as send-otp but enforces cooldown strictly
ERRORS:
  429 — if called within OTP_RESEND_TIME seconds of last OTP
```

---

#### POST /api/password/verify-otp

```
AUTH: None (public)
REQUEST BODY: { email: string, otp: string }
CALL CHAIN:
  controller.verifyOtp
    → otpService.verify(email, otp)   [reads 'otps', checks expiry]
RESPONSE (200): { success: true, message: "OTP verified." }
ERRORS:
  400 — missing fields
  400 — invalid or expired OTP
```

---

#### POST /api/password/reset

```
AUTH: None (public)
REQUEST BODY: { email: string, otp: string, newPassword: string }
VALIDATION:
  - newPassword minimum 6 characters
CALL CHAIN:
  controller.reset
    → userService.findByEmail(email)              [reads 'users']
    → otpService.verify(email, otp)               [reads 'otps']
    → Firebase Auth: updateUser(uid, { password: newPassword })
    → otpService.deleteByEmail(email)             [deletes from 'otps']
SIDE_EFFECTS:
  - Updates Firebase Auth password
  - Deletes OTP record from 'otps'
RESPONSE (200): { success: true, message: "Password reset successfully." }
ERRORS:
  400 — missing fields, password too short
  400 — invalid or expired OTP
  404 — email not registered
  500 — Firebase Auth error
```

---

### 6.4 User — /api/user

**Files:** `backend/routes/user.js` → `backend/controllers/user.js`

---

#### GET /api/user/profile

```
AUTH: Required (any role)
CALL CHAIN:
  controller.getProfile
    → userService.findByUserId(req.user.userId)   [reads 'users']
RESPONSE (200):
  {
    user: {
      userId, email, firstName, lastName, fatherName, dob,
      phone, countryCode, city, admin_number, role,
      street, doorNo, state, pincode, aadhar, pan, ...
    }
  }
```

---

#### PUT /api/user/profile

```
AUTH: Required (any role)
REQUEST BODY (partial — only allowed fields):
  firstName, lastName, fatherName, dob, email, phone, countryCode,
  city, street, doorNo, state, pincode, aadhar, pan
CALL CHAIN:
  controller.updateProfile
    → sanitize/trim string inputs
    → userService.updateUser(req.user.userId, sanitizedData)  [updates 'users']
RESPONSE (200): { message: "Profile updated.", user: { ...updated fields } }
ERRORS:
  400 — invalid field types
  404 — user not found
```

---

#### PUT /api/user/password

```
AUTH: Required (any role)
REQUEST BODY: { oldPassword: string, newPassword: string, confirmPassword: string }
VALIDATION:
  - All three fields required
  - newPassword === confirmPassword
  - newPassword min 6 chars
  - newPassword !== oldPassword
CALL CHAIN:
  controller.changePassword
    → userService.findByUserId(userId)                    [reads 'users']
    → Firebase REST API: verifyPassword(email, oldPassword)
    → Firebase Auth: updateUser(uid, { password: newPassword })
RESPONSE (200): { message: "Password changed successfully." }
ERRORS:
  400 — validation failures (descriptive messages)
  401 — old password incorrect
  500 — Firebase error
```

---

#### GET /api/user/all

```
AUTH: Required | ROLE: admin
CALL CHAIN:
  controller.getAllUsers → userService.getAllUsers()   [reads 'users']
RESPONSE (200): { users: [ {...user objects} ] }
```

---

#### GET /api/user/:userId

```
AUTH: Required | ROLE: admin
PARAMS: userId (custom string userId, not Firestore ID)
CALL CHAIN:
  controller.getUserById → userService.findByUserId(userId)   [reads 'users']
RESPONSE (200): { user: {...} }
ERRORS:
  404 — user not found
```

---

#### DELETE /api/user/:userId

```
AUTH: Required | ROLE: admin
PARAMS: userId (custom string userId)
CALL CHAIN:
  controller.deleteUser
    → userService.findByUserId(userId)        [reads 'users']
    → db.collection('users').doc(docId).delete()
    → Firebase Auth: deleteUser(firebaseUid)  [graceful fail if not found]
SIDE_EFFECTS:
  - Deletes user document from 'users' collection
  - Deletes Firebase Auth account (best-effort)
RESPONSE (200): { message: "User deleted successfully." }
ERRORS:
  404 — user not found
  500 — Firestore error
```

---

### 6.5 Excel — /api/excel

**Files:** `backend/routes/excelMaster.js` → `backend/controllers/excelMaster.js`

---

#### GET /api/excel/master

```
AUTH: Required (any role)
QUERY PARAMS: limit (number, max 2000, default 500)
CALL CHAIN:
  controller.listMaster → excelMasterService.list({ limit })  [reads 'Excel_master']
RESPONSE (200):
  {
    count: number,
    columns: [ column names array ],
    rows: [ { ledger_id, code, type, ledger, city, group, name, address1, ... } ]
  }
NOTE: ledger values returned as UPPERCASE, city as lowercase
```

---

#### GET /api/excel/master/:ledger_id

```
AUTH: Required (any role)
PARAMS: ledger_id (string)
CALL CHAIN:
  controller.getMasterById → excelMasterService.getByLedgerId(ledger_id)
RESPONSE (200): { data: { ...all master fields } }
ERRORS:
  404 — ledger_id not found
```

---

#### GET /api/excel/master/paged

```
AUTH: Required (any role)
QUERY PARAMS: after (string — ledger_id of the last row on the previous page)
CALL CHAIN:
  controller.listMasterPaged → excelMasterService.listPaged({ after })
  [reads 'Excel_master' ordered by ledger_id ASC, startAfter cursor if provided]
RESPONSE (200):
  {
    count: number,
    columns: [ column names ],
    rows: [ { ledger_id, ...masterFields } ],
    nextCursor: string | null   (ledger_id of last row, null when no more pages)
  }
NOTE: Always returns exactly 15 rows per page; pass nextCursor as after= on the next call
```

---

#### POST /api/excel/master/upload

```
AUTH: Required | ROLE: admin
CONTENT-TYPE: multipart/form-data
FORM FIELD: file (.xlsx, .xls, or .csv, max 15 MB)
CALL CHAIN:
  controller.uploadMaster
    → multer (in-memory storage, file size/type validation)
    → excelParser.parseExcelMasterBuffer(req.file.buffer)
        → reads workbook, auto-detects header row
        → normalizes column names (lowercase, strip spaces/dashes/underscores)
        → maps to EXCEL_MASTER_FIELDS
        → returns { records: [...], error? }
    → generate ledger_id for each record (trim + removeSpaces + toUpperCase)
    → excelMasterService.bulkInsert(records, { userId, fileName })
        → deduplicates by ledger_id (last row in file wins)
        → diffs against existing 'Excel_master' documents
        → batch writes (max 400 per Firestore batch)
        → returns { inserted, updated }
    → ledgerRemainderService.upsertFromExcelRecords(records, meta)
        → for each unique ledger:
            if not in 'Outstanding_Remainder': create new document
            if exists: update city/group/contact but preserve nextCallDate/debit/credit
SIDE_EFFECTS:
  - Inserts/updates 'Excel_master' collection
  - Creates/updates 'Outstanding_Remainder' collection (auto-seeding)
RESPONSE (200):
  {
    message: "Master data uploaded successfully.",
    inserted: number,
    updated: number,
    fileName: string
  }
ERRORS:
  400 — no file, wrong file type, parse error
  413 — file exceeds 15 MB
  500 — Firestore batch write error
```

---

#### POST /api/excel/outstanding/upload

```
AUTH: Required | ROLE: admin
CONTENT-TYPE: multipart/form-data
FORM FIELD: file (.xlsx, .xls, or .csv, max 15 MB)
CALL CHAIN:
  controller.uploadOutstanding
    → multer (in-memory)
    → outstandingParser.parseOutstandingBuffer(req.file.buffer)
        → auto-detects columns: LEDGER, GROUP, DEBIT, CREDIT, DATE (dd/mm/yyyy), COMMENTS
        → handles Excel serial dates, ISO dates, DD/MM/YYYY strings
        → returns { validRecords, invalidRecords, error? }
    → generate ledger_id for each record
    → fetch existing ledger_ids from 'Excel_master' for validation
    → outstanding.service.processOutstandingRecords(validRecords, userId, fileName)
        → for each record:
            look up 'Outstanding_Remainder' by ledger_id
            compare new values against stored values
            if unchanged: skip (no write, no log)
            if changed:
              update 'Outstanding_Remainder' document
              call ledgerLogsService.addLog(logEntry)  [writes 'Ledger_logs']
        → returns { processed, found, notFound, updated, logsCreated }
SIDE_EFFECTS:
  - Updates 'Outstanding_Remainder' (debit, credit, date, comments)
  - Creates audit log entries in 'Ledger_logs' for changed fields only
RESPONSE (200):
  {
    message: "Outstanding data processed.",
    processed: number,
    updated: number,
    logsCreated: number,
    found: number,
    notFound: number,
    fileName: string
  }
ERRORS:
  400 — no file, parse error
  500 — Firestore error
```

---

### 6.6 Ledger Remainder — /api/ledger-remainder

**Files:** `backend/routes/ledgerRemainder.js` → `backend/controllers/ledgerRemainder.js`

---

#### GET /api/ledger-remainder/

```
AUTH: Required (any role)
QUERY PARAMS: limit (default 500)
CALL CHAIN:
  controller.list
    → ledgerRemainderService.list({ limit, city: req.user.role==='admin' ? null : req.user.city })
    [reads 'Outstanding_Remainder', city-filtered for employees]
RESPONSE (200):
  {
    rows: [
      {
        ledger_id, ledger_name, city, group, debit, credit,
        nextCallDate, lastComments, lastUpdatedAt, updatedByUserId,
        contact, mobile, email,
        cname1, cmob1, cemail1,
        cname2, cmob2, cemail2,
        cname3, cmob3, cemail3
      }
    ],
    count: number,
    columns: [ column names ]
  }
```

---

#### GET /api/ledger-remainder/paged

```
AUTH: Required (any role)
QUERY PARAMS: after (JSON string — cursor object { nextCallDate, ledger_id } from previous page)
CALL CHAIN:
  controller.listPaged → ledgerRemainderService.listPaged({ after, city })
  [reads 'Outstanding_Remainder' ordered by nextCallDate DESC, ledger_id ASC]
  [city-filtered for employees]
RESPONSE (200):
  {
    count: number,
    rows: [ { ...remainder fields } ],
    nextCursor: { nextCallDate: string, ledger_id: string } | null
  }
REQUIRES INDEXES:
  nextCallDate DESC + ledger_id ASC (no city filter)
  city ASC + nextCallDate DESC + ledger_id ASC (with city filter)
NOTE: Always returns exactly 15 rows per page
```

---

#### GET /api/ledger-remainder/upcoming

```
AUTH: Required (any role)
QUERY PARAMS:
  days   (number, default 7)
  limit  (number, default 50)
CALL CHAIN:
  controller.getUpcoming
    → ledgerRemainderService.getUpcomingRemainders({
        days, limit,
        city: admin ? null : req.user.city
      })
    [reads 'Outstanding_Remainder' where nextCallDate BETWEEN today AND today+days]
    [REQUIRES Firestore composite index: city ASC, nextCallDate ASC]
    → for each record: fetch updatedByUserId user first name from 'users'
RESPONSE (200):
  {
    rows: [ { ...remainder fields, updatedByFirstName } ],
    count: number,
    days: number,
    todayDate: "YYYY-MM-DD"
  }
ERRORS:
  500 — missing Firestore index (will throw "index required" error)
```

---

#### GET /api/ledger-remainder/:ledger_id

```
AUTH: Required (any role)
PARAMS: ledger_id (string)
CALL CHAIN:
  controller.getById → ledgerRemainderService.getByLedgerId(ledger_id)
RESPONSE (200): { row: { ...all remainder fields } }
ERRORS:
  404 — ledger_id not found
```

---

#### PUT /api/ledger-remainder/:ledger_id

```
AUTH: Required (any role)
PARAMS: ledger_id (string)
REQUEST BODY (all optional):
  {
    nextCallDate: "YYYY-MM-DD" | null,
    lastComments: string (new comment text to append),
    cname1: string | null,  cmob1: string | null,  cemail1: string | null,
    cname2: string | null,  cmob2: string | null,  cemail2: string | null,
    cname3: string | null,  cmob3: string | null,  cemail3: string | null
  }
VALIDATION:
  - nextCallDate: valid date string or null
  - Customer phone (cmob1-3): min 5 digits if provided
  - Customer email (cemail1-3): valid email format if provided
  - Non-admin GUARD: if slot already has data (cname/cmob/cemail),
    non-admin CANNOT overwrite → 403
CALL CHAIN:
  controller.update
    → ledgerRemainderService.getByLedgerId(ledger_id)   [verify exists]
    → customerValidator.processCustomerData(1..3, {...})  [validate+sanitize each slot]
    → ledgerRemainderService.updateByLedgerId(ledger_id, updateData)
        → if lastComments provided:
            fetch existing lastComments array
            append new comment as { text, date: ISO_timestamp }
            keep only last 5 (remove oldest if 6+ exist)
        [updates 'Outstanding_Remainder']
    → if nextCallDate or lastComments changed (non-empty comment):
        ledgerLogsService.addLog({
          ledger_id, ledger_name, group, city,
          ldebit, lcredit, nextCallDate, comments,
          operation: 'update',
          updatedFields: ['nextCallDate'] | ['comments'] | ['nextCallDate','comments'],
          createdByUserId
        })  [writes 'Ledger_logs']
SIDE_EFFECTS:
  - Updates 'Outstanding_Remainder' document
  - May create audit log in 'Ledger_logs'
  - Comments array automatically caps at 5 items (FIFO removal)
RESPONSE (200):
  {
    success: true,
    data: { ...updated remainder (with lastComments array) },
    updatedFields: {
      nextCallDate: string | null,
      lastComments: [ { text, date }, ... ] (full array),
      customers: { slot1: {...}, slot2: {...}, slot3: {...} }
    }
  }
ERRORS:
  400 — invalid date, invalid phone, invalid email
  403 — non-admin attempting to overwrite occupied customer slot
  404 — ledger_id not found
```

---

#### DELETE /api/ledger-remainder/:ledger_id/customer/:slot

```
AUTH: Required | ROLE: admin
PARAMS:
  ledger_id (string)
  slot (number: 1, 2, or 3)
CALL CHAIN:
  controller.deleteCustomer
    → ledgerRemainderService.getByLedgerId(ledger_id)   [verify exists]
    → ledgerRemainderService.updateByLedgerId(ledger_id, {
        [`cname${slot}`]: null,
        [`cmob${slot}`]: null,
        [`cemail${slot}`]: null
      })
SIDE_EFFECTS:
  - Sets cname{slot}, cmob{slot}, cemail{slot} to null in 'Outstanding_Remainder'
RESPONSE (200): { success: true, message: "Customer slot ${slot} cleared." }
ERRORS:
  400 — slot not 1, 2, or 3
  404 — ledger_id not found
```

---

### 6.7 Ledger Logs — /api/ledger-logs

**Files:** `backend/routes/ledgerLogs.js` → `backend/controllers/ledgerLogs.js`

---

#### GET /api/ledger-logs/

```
AUTH: Required (any role)
QUERY PARAMS: limit (default 500)
CALL CHAIN:
  controller.list
    → ledgerLogsService.list({
        limit,
        city: admin ? null : req.user.city
      })
    [reads 'Ledger_logs', sorted by timestamp DESC, city-filtered for employees]
RESPONSE (200):
  {
    count: number,
    logs: [
      {
        id, ledger_id, ledger_name, group, city,
        ldebit, lcredit, nextCallDate, date, comments,
        operation, updatedFields, timestamp, createdByUserId
      }
    ]
  }
```

---

#### GET /api/ledger-logs/paged

```
AUTH: Required (any role)
QUERY PARAMS: after (string — ISO timestamp of the last row on the previous page)
CALL CHAIN:
  controller.listPaged → ledgerLogsService.listPaged({ after, city })
  [reads 'Ledger_logs' ordered by timestamp DESC, city-filtered for employees]
RESPONSE (200):
  {
    count: number,
    rows: [ { id, ...log fields } ],
    nextCursor: string | null   (timestamp of last row, null when no more pages)
  }
NOTE: Always returns exactly 15 rows per page
```

---

#### GET /api/ledger-logs/export

```
AUTH: Required (any role)
QUERY PARAMS:
  dateFrom  (YYYY-MM-DD, default: 60 days ago)
  dateTo    (YYYY-MM-DD, default: today)
CALL CHAIN:
  controller.exportLogs
    → ledgerLogsService.exportByDateRange({
        dateFrom, dateTo,
        city: admin ? null : req.user.city
      })
    → generate Excel workbook with ExcelJS:
        color-coded cells:
          Green fill  → debit values
          Red fill    → credit values
          Blue fill   → nextCallDate updates
          Amber fill  → comment updates
RESPONSE:
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="ledger-logs-{YYYY-MM-DD}.xlsx"
  Body: Excel binary buffer
ERRORS:
  400 — invalid date format
  500 — ExcelJS error
```

---

#### GET /api/ledger-logs/:ledger_id

```
AUTH: Required (any role)
PARAMS: ledger_id (string)
QUERY PARAMS: limit (default 100)
CALL CHAIN:
  controller.getByLedgerId
    → ledgerLogsService.getLogsByLedgerId(ledger_id, { limit })
    [reads 'Ledger_logs' where ledger_id matches, sorted by timestamp DESC]
RESPONSE (200): { ledger_id, count, logs: [...] }
```

---

#### PUT /api/ledger-logs/:logId

```
AUTH: Required (any role)
PARAMS: logId (Firestore document ID)
REQUEST BODY: { dateCalls: "YYYY-MM-DD", lastComments: string }
CALL CHAIN:
  controller.updateLog
    → ledgerLogsService.updateLog(logId, { date: dateCalls, lastComments })
    [updates 'Ledger_logs' document]
RESPONSE (200): { message: "Log updated.", data: { ...updated log } }
ERRORS:
  404 — logId not found
```

---

### 6.8 Admin Dashboard — /api/admin

**Files:** `backend/routes/adminDashboard.js` → `backend/controllers/adminDashboard.js`

---

#### GET /api/admin/dashboard

```
AUTH: Required | ROLE: admin
CALL CHAIN:
  controller.getDashboard
    → userService.getAllUsers()                        [reads 'users']
    → activityService.getAllLastLogins(userIds)        [reads 'loginActivities', batched]
    → registrationService.getPendingRequests()         [reads 'requests' where status='pending']
    → merge lastLogin into each employee object
    → sort employees alphabetically by name
RESPONSE (200):
  {
    stats: {
      employees: number,
      pendingRequests: number
    },
    employees: [
      {
        empId, firstName, lastName, email, phone, countryCode,
        city, role,
        lastLogin: "DD/MM/YYYY HH:MM AM/PM" | null
      }
    ],
    pendingRequests: [
      {
        id, firstName, lastName, email, phone, countryCode, city,
        createdAt: ISO string
      }
    ]
  }
```

---

#### PATCH /api/admin/users/:userId

```
AUTH: Required | ROLE: admin
PARAMS: userId (custom string userId)
REQUEST BODY (all optional):
  { city: string, phone: string, countryCode: string }
CALL CHAIN:
  controller.updateUserContact
    → userService.updateUser(userId, { city, phone, countryCode })  [updates 'users']
RESPONSE (200): { message: "User updated successfully.", ...updatedFields }
ERRORS:
  400 — no valid fields provided
  500 — Firestore error
```

---

#### DELETE /api/admin/users/:userId

```
AUTH: Required | ROLE: admin
PARAMS: userId (custom string userId)
CALL CHAIN:
  controller.deleteUser
    → userService.deleteUser(userId)
        → findByUserId(userId)                     [reads 'users']
        → Firebase Auth: getUserByEmail → deleteUser  [best-effort]
        → db.collection('users').doc(docId).delete()
RESPONSE (200): { message: "User deleted successfully." }
ERRORS:
  500 — user not found or Firestore error
```

---

### 6.9 Seeder — /api/seed

**Files:** `backend/routes/seeder.js` → `backend/controllers/seeder.js`

---

#### POST /api/seed/admin

```
AUTH: None (protected by obscurity — no public route in production)
REQUEST BODY (optional — falls back to env vars):
  { firstName, lastName, fatherName, dob, adminNumber, countryCode }
CALL CHAIN:
  controller.seedAdmin
    → reads ADMIN_* env vars (or body)
    → EMAIL_USER from env as admin email
    → generator.generateCredentials(firstName, fatherName, dob)
    → Firebase Auth: createUser({ email, password })
    → userService.createUser({ ...adminData, role:'admin' })  [writes 'users']
RESPONSE (200):
  {
    message: "Admin created.",
    admin: { ...user fields },
    credentials: { userId, password }
  }
```

---

#### GET /api/seed/admins

```
AUTH: None
CALL CHAIN:
  controller.getAdmins → userService.getAllUsers() → filter role==='admin'
RESPONSE (200): { admins: [...] }
```

---

### 6.10 Counter — /api/counter

**Files:** `backend/routes/counter.js` → `backend/controllers/counter.js`

---

#### GET /api/counter

```
AUTH: Required (any role)
CALL CHAIN:
  controller.getStats → counterService.getCounter()   [reads 'counters' doc 'app_stats']
RESPONSE (200):
  {
    stats: {
      src_master: string | null,          (filename of last master upload)
      src_outstanding: string | null,     (filename of last outstanding upload)
      src_master_date: ISO string | null, (timestamp of last master upload)
      src_outstanding_date: ISO string | null,
      totalLedgers: number,               (count of Excel_master documents)
      totaldebit: number,                 (sum of all Outstanding_Remainder.debit)
      totalcredit: number                 (sum of all Outstanding_Remainder.credit)
    }
  }
NOTE: Counter is updated automatically after every master/outstanding upload.
      Returns {} if no uploads have occurred yet.
ERRORS:
  401 — not authenticated
  500 — Firestore error
```

---

### 6.11 System Endpoints

```
GET /health
  AUTH: None
  RESPONSE (200): { status: 'ok', timestamp: ISO string }

GET *  (SPA fallback — any non-API route)
  RESPONSE: serves /frontend/dist/index.html
```

---

## 7. Backend — Services

Services contain all Firestore operations and business logic. Controllers call services; services never call controllers.

### 7.1 user.js

**File:** `backend/services/user.js`

```
FUNCTION: findByUserId(userId)
  CALLS: db.collection('users').where('userId','==',userId).get()
  RETURNS: { id, ...userData } | null

FUNCTION: findByEmail(email)
  CALLS: db.collection('users').where('email','==',email.toLowerCase()).get()
  RETURNS: { id, ...userData } | null

FUNCTION: findByPhone(phone)
  CALLS: db.collection('users').where('phone','==',phone).get()
  RETURNS: { id, ...userData } | null

FUNCTION: findByAdminNumber(adminNumber)
  CALLS: db.collection('users').where('admin_number','==',adminNumber).get()
  RETURNS: { id, ...userData } | null

FUNCTION: createUser(userData)
  CALLS: db.collection('users').add({ ...userData, createdAt: serverTimestamp() })
  RETURNS: { id: newDocId, ...userData }
  SIDE_EFFECTS: creates document in 'users' collection

FUNCTION: getAllUsers()
  CALLS: db.collection('users').get()
  RETURNS: [ { id, ...userData }, ... ]

FUNCTION: updateUser(userId, data)
  CALLS: db.collection('users').doc(docId).update(sanitizedData)
  RETURNS: { id, ...updatedData }
  NOTE: finds doc by userId field first, then updates by Firestore ID

FUNCTION: deleteUser(userId)
  CALLS: findByUserId(userId)
         Firebase Auth: getUserByEmail → deleteUser  [best-effort, warn on failure]
         db.collection('users').doc(docId).delete()
  SIDE_EFFECTS: removes user from Firestore and Firebase Auth (Auth deletion is best-effort)
```

---

### 7.2 registration.js

**File:** `backend/services/registration.js`

```
FUNCTION: createRequest(data)
  CALLS: db.collection('requests').add({ ...data, status:'pending', createdAt: serverTimestamp() })
  RETURNS: { requestId }

FUNCTION: findByEmail(email)
  CALLS: db.collection('requests').where('email','==',email).get()
  RETURNS: [ {id, ...} ]

FUNCTION: findByEmailAndStatus(email, status)
  CALLS: db.collection('requests').where('email','==',email).where('status','==',status).get()
  RETURNS: [ {id, ...} ]

FUNCTION: findByPhone(phone)
  CALLS: db.collection('requests').where('phone','==',phone).get()
  RETURNS: [ {id, ...} ]

FUNCTION: getPendingRequests()
  CALLS: db.collection('requests').where('status','==','pending').get()
  RETURNS: [ {id, ...} ]

FUNCTION: getAllRequests()
  CALLS: db.collection('requests').get()
  RETURNS: [ {id, ...} ]

FUNCTION: updateStatus(id, status)
  CALLS: db.collection('requests').doc(id).update({ status, processedAt: serverTimestamp() })
  RETURNS: void

FUNCTION: deleteRequest(id)
  CALLS: db.collection('requests').doc(id).delete()
  RETURNS: void
```

---

### 7.3 excelMaster.js

**File:** `backend/services/excelMaster.js`

```
FUNCTION: bulkInsert(rows, meta)
  PARAMS: rows (array of normalized master records), meta { userId, fileName }
  CALL CHAIN:
    → fetch all existing documents from 'Excel_master'
    → deduplicate rows by ledger_id (last row wins if duplicate in file)
    → for each row: diff against existing document field-by-field
    → batch write (max 400 per Firestore WriteBatch)
    → tracks inserted (new) vs updated (changed)
  RETURNS: { inserted: number, updated: number }
  SIDE_EFFECTS: writes/updates 'Excel_master' collection

FUNCTION: list(opts)
  PARAMS: { limit: number }
  CALLS: db.collection('Excel_master').limit(limit).get()
  RETURNS: { records: [...], count }

FUNCTION: getByLedgerId(ledger_id)
  CALLS: db.collection('Excel_master').where('ledger_id','==',ledger_id).get()
  RETURNS: { ...masterRecord } | null
```

---

### 7.4 ledgerRemainder.js

**File:** `backend/services/ledgerRemainder.js`

```
FUNCTION: upsertFromExcelRecords(records, meta)
  PARAMS: records (from Excel master upload), meta { userId, fileName }
  CALL CHAIN:
    → extract unique ledger entries from records
    → for each ledger:
        query 'Outstanding_Remainder' by ledger_id
        if new: create document (empty nextCallDate, 0 debit/credit)
        if exists: update city/group/contact fields; PRESERVE nextCallDate/debit/credit
  RETURNS: { inserted, updated }
  SIDE_EFFECTS: writes 'Outstanding_Remainder' collection

FUNCTION: list(opts)
  PARAMS: { limit, city? }
  CALLS: db.collection('Outstanding_Remainder')
           [.where('city','==',city) if city provided]
           .limit(limit).get()
  RETURNS: { rows: [...], count }

FUNCTION: getUpcomingRemainders(opts)
  PARAMS: { days, limit, city? }
  CALLS: db.collection('Outstanding_Remainder')
           .where('nextCallDate','>=',todayStr)
           .where('nextCallDate','<=',futureDateStr)
           [.where('city','==',city) if city provided]
           .orderBy('nextCallDate','asc')
           .limit(limit).get()
  RETURNS: { rows: [...], count }
  NOTE: Requires Firestore composite index (city ASC, nextCallDate ASC)

FUNCTION: getByLedgerId(ledger_id)
  CALLS: db.collection('Outstanding_Remainder').where('ledger_id','==',ledger_id).get()
  RETURNS: { id, ...remainderData } | null

FUNCTION: updateByLedgerId(ledger_id, updateData)
  CALLS: db.collection('Outstanding_Remainder').doc(docId).update({
           ...updateData, lastUpdatedAt: serverTimestamp()
         })
  RETURNS: { id, ...updatedData }

FUNCTION: delete(id)
  CALLS: db.collection('Outstanding_Remainder').doc(id).delete()
  RETURNS: void
```

---

### 7.5 ledgerLogs.js

**File:** `backend/services/ledgerLogs.js`

```
FUNCTION: addLog(logData)
  PARAMS: {
    ledger_id, ledger_name, group, city,
    ldebit, lcredit, nextCallDate, date, comments,
    operation ('insert'|'update'), updatedFields (array), createdByUserId
  }
  CALLS: db.collection('Ledger_logs').add({ ...logData, timestamp: serverTimestamp() })
  RETURNS: { id: newLogId }

FUNCTION: addLogs(logs)
  PARAMS: array of log objects
  CALLS: batch write to 'Ledger_logs' (max 400 per batch)
  RETURNS: void

FUNCTION: getLogsByLedgerId(ledger_id, opts)
  PARAMS: { limit }
  CALLS: db.collection('Ledger_logs').where('ledger_id','==',ledger_id)
           .orderBy('timestamp','desc').limit(limit).get()
  RETURNS: [ {id, ...log} ]

FUNCTION: list(opts)
  PARAMS: { limit, city? }
  CALLS: db.collection('Ledger_logs')
           [.where('city','==',city) if provided]
           .orderBy('timestamp','desc').limit(limit).get()
  RETURNS: { count, logs: [...] }

FUNCTION: exportByDateRange(opts)
  PARAMS: { dateFrom, dateTo, city? }
  CALLS: db.collection('Ledger_logs')
           .where('timestamp','>=',startDate)
           .where('timestamp','<=',endDate)
           [.where('city','==',city) if provided]
           .get()
  RETURNS: [ {id, ...log} ]

FUNCTION: updateLog(logId, updateData)
  PARAMS: { date, lastComments }
  CALLS: db.collection('Ledger_logs').doc(logId).update(updateData)
  RETURNS: { id, ...updatedLog }
```

---

### 7.6 outstanding.js

**File:** `backend/services/outstanding.js`

```
FUNCTION: processOutstandingRecords(validRecords, userId, fileName)
  PARAMS:
    validRecords: [ { ledger, group, debit, credit, date, comments, ledger_id } ]
    userId: string (from req.user)
    fileName: string
  CALL CHAIN:
    → pre-fetch all ledger_ids from 'Excel_master' (for validation)
    → for each record:
        if ledger_id not in Excel_master: add to notFound list, skip
        fetch existing 'Outstanding_Remainder' doc by ledger_id
        compare new { debit, credit, date, comments } against stored values
        if NO change in any field: skip (no write, no log)
        if changed:
          update 'Outstanding_Remainder' via ledgerRemainderService.updateByLedgerId
          create log via ledgerLogsService.addLog (updatedFields = list of changed keys)
  RETURNS:
    { processed: number, found: number, notFound: number, updated: number, logsCreated: number }
  SIDE_EFFECTS:
    - Updates 'Outstanding_Remainder' documents
    - Creates 'Ledger_logs' entries for changed fields only

FUNCTION: getSummary(ledger_id)
  CALLS:
    ledgerRemainderService.getByLedgerId(ledger_id)
    ledgerLogsService.getLogsByLedgerId(ledger_id, { limit: 10 })
  RETURNS: { outstanding: {...}, recentLogs: [...] }
```

---

### 7.7 activity.js

**File:** `backend/services/activity.js`

```
FUNCTION: recordLogin(userId)
  CALL CHAIN:
    → db.collection('loginActivities')
        .where('userId','==',userId)
        .orderBy('timestamp','desc')
        .limit(2).get()
    → if 2 records already exist: delete oldest
    → add new record { userId, timestamp: serverTimestamp() }
  SIDE_EFFECTS: writes to 'loginActivities', maintains max 2 records per user
  RETURNS: void

FUNCTION: getLastLogin(userId)
  CALLS: db.collection('loginActivities')
           .where('userId','==',userId)
           .orderBy('timestamp','desc')
           .limit(1).get()
  RETURNS: { timestamp, date: "DD/MM/YYYY", time: "HH:MM AM/PM" } | null

FUNCTION: getAllLastLogins()
  CALL CHAIN:
    → db.collection('loginActivities').get()   [single full collection read]
    → builds Map<userId → most-recent activity> in memory (latest timestamp wins per user)
  RETURNS: Map<userId → { date, time, timestamp } | undefined>
```

---

### 7.8 otp.js

**File:** `backend/services/otp.js`

```
FUNCTION: create(email, otp)
  CALL CHAIN:
    → deleteByEmail(email)  [remove any existing OTP for this email]
    → db.collection('otps').add({
        email, otp,
        createdAt: serverTimestamp(),
        expiresAt: serverTimestamp() + OTP_VALID_TIME seconds
      })
  RETURNS: { id: newOtpId }

FUNCTION: findValidOtp(email)
  CALLS: db.collection('otps').where('email','==',email).get()
         → filter: expiresAt > now
  RETURNS: { id, email, otp, createdAt, expiresAt } | null

FUNCTION: findMostRecent(email)
  CALLS: db.collection('otps').where('email','==',email)
           .orderBy('createdAt','desc').limit(1).get()
  RETURNS: { id, ...otpData } | null

FUNCTION: verify(email, otp)
  CALLS: findValidOtp(email)
         → checks otp string matches
  RETURNS: { valid: boolean, message: string }

FUNCTION: deleteByEmail(email)
  CALLS: batch delete all 'otps' documents where email matches
  RETURNS: void

FUNCTION: cleanupExpired()
  CALLS: db.collection('otps').where('expiresAt','<',now).limit(100).get()
         → batch delete found documents
  RETURNS: { deleted: number }
  NOTE: scheduled to run every OTP_VALID_TIME seconds on server start
```

---

### 7.9 counter.js

**File:** `backend/services/counter.js`

```
COLLECTION: 'counters'  DOCUMENT ID: 'app_stats'

FUNCTION: updateMasterUpload(fileName)
  CALL CHAIN:
    → db.collection('Excel_master').count().get()   [aggregate count query]
    → counterRef().set({ src_master, src_master_date, totalLedgers }, { merge:true })
  SIDE_EFFECTS: updates counters/app_stats
  CALLED BY: excelMasterService.bulkInsert (fire-and-forget)

FUNCTION: updateOutstandingUpload(fileName)
  CALL CHAIN:
    → db.collection('Excel_master').count().get()   [aggregate count]
    → db.collection('Outstanding_Remainder').select('debit','credit').get()  [field projection]
    → counterRef().set({ src_outstanding, src_outstanding_date, totalLedgers, totaldebit, totalcredit }, { merge:true })
  CALLED BY: outstandingService.processOutstandingRecords (awaited)

FUNCTION: updateLedgerTotals()
  CALL CHAIN:
    → db.collection('Outstanding_Remainder').select('debit','credit').get()
    → counterRef().set({ totaldebit, totalcredit }, { merge:true })
  CALLED BY: ledgerRemainderService.upsertFromExcelRecords,
             ledgerRemainderService.updateByLedgerId (both fire-and-forget)

FUNCTION: getCounter()
  CALLS: counterRef().get()
  RETURNS: { src_master, src_outstanding, src_master_date, src_outstanding_date,
             totalLedgers, totaldebit, totalcredit } | {}
```

---

## 8. Backend — Utilities

### 8.1 jwt.js

**File:** `backend/utils/jwt.js`

```
FUNCTION: generateToken(userId, email, role, firstName, city)
  PURPOSE: Create signed JWT
  CALLS: jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  PAYLOAD: { userId, email, role, firstName, city }
  RETURNS: string (JWT token)

FUNCTION: verifyToken(token)
  PURPOSE: Verify and decode JWT
  CALLS: jsonwebtoken.verify(token, JWT_SECRET)
  RETURNS: decoded payload object
  THROWS: JsonWebTokenError | TokenExpiredError

FUNCTION: decodeToken(token)
  PURPOSE: Decode without verification (for inspection only)
  CALLS: jsonwebtoken.decode(token)
  RETURNS: decoded payload | null
```

---

### 8.2 mailer.js

**File:** `backend/utils/mailer.js`

```
TRANSPORT: nodemailer with Gmail SMTP
  host: smtp.gmail.com
  auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD }

FUNCTION: sendEmailToAdmin({ requestId, firstName, lastName, email, phone, city })
  PURPOSE: Notify admin of new registration request
  SENDS TO: EMAIL_USER (admin's email)
  SUBJECT: "New Registration Request"
  BODY: HTML with applicant details

FUNCTION: sendCredentialsEmail({ email, firstName, userId, password })
  PURPOSE: Send login credentials to newly approved employee
  SENDS TO: user's email
  SUBJECT: "Your 3i Services Account Credentials"
  BODY: HTML with userId + password + login URL

FUNCTION: sendOtpEmail({ email, firstName, otp })
  PURPOSE: Send password reset OTP
  SENDS TO: user's email
  SUBJECT: "Password Reset OTP"
  BODY: HTML with OTP code + expiry notice

NOTE: All email sends are fire-and-forget in most callers (errors logged but not propagated)
```

---

### 8.3 generator.js

**File:** `backend/utils/generator.js`

```
FUNCTION: generateCredentials(firstName, fatherName, dob)
  PURPOSE: Generate deterministic userId + password from personal info
  ALGORITHM:
    userId   = firstName.toLowerCase().trim() + DDMM(dob)
               e.g. "john" + "1503" → "john1503"
    password = first4chars(fatherName).toLowerCase() + '#' + DD(dob)
               e.g. "kuma" + "#15" → "kuma#15"
  RETURNS: { userId, password }

FUNCTION: generateRandomPassword(length = 12)
  PURPOSE: Generate secure random password
  ALGORITHM: pool of uppercase + lowercase + digits + special chars, random picks
  RETURNS: string (length chars)

FUNCTION: generateRandomCredentials(firstName, fatherName, dob)
  PURPOSE: Generate userId (deterministic) + random password
  RETURNS: { userId, password }
```

---

### 8.4 excelParser.js

**File:** `backend/utils/excelParser.js`

```
FUNCTION: parseExcelMasterBuffer(buffer)
  PURPOSE: Parse Excel/CSV file buffer into master data records
  CALL CHAIN:
    → xlsx.read(buffer, { type:'buffer' })
    → take first sheet
    → find header row (looks for known field names)
    → normalize headers: lowercase, remove spaces/dashes/underscores
    → map each row to EXCEL_MASTER_FIELDS using normalized column names
    → skip empty rows
    → generate ledger_id for each row
  RETURNS: { records: [ {...masterFields} ], error?: string }
  NOTABLE:
    - Tolerates merged headers, extra columns
    - City → lowercase, Ledger → UPPERCASE
    - EXCEL_MASTER_FIELDS from backend/models/excelMaster.js (42 fields)
```

---

### 8.5 outstandingParser.js

**File:** `backend/utils/outstandingParser.js`

```
FUNCTION: parseOutstandingBuffer(buffer)
  PURPOSE: Parse Outstanding Excel file into balance records
  CALL CHAIN:
    → xlsx.read(buffer, { type:'buffer' })
    → take first sheet
    → auto-detect columns: LEDGER, GROUP, DEBIT, CREDIT, DATE, COMMENTS
      (case-insensitive, partial match allowed)
    → for each data row:
        parse DEBIT/CREDIT as numbers (handles currency formatting)
        parse DATE:
          if Excel serial number → convert to date
          if ISO string → parse directly
          if "DD/MM/YYYY" string → parse manually
  RETURNS:
    {
      validRecords: [ { ledger, group, debit, credit, date, comments } ],
      invalidRecords: [ { row, reason } ],
      error?: string
    }
  NOTABLE: Tolerates missing DATE/COMMENTS columns (defaults to null)
```

---

### 8.6 customerValidator.js

**File:** `backend/utils/customerValidator.js`

```
FUNCTION: processCustomerData(index, customerData)
  PARAMS:
    index: 1 | 2 | 3 (slot number)
    customerData: { name, mob, email }
  VALIDATION RULES:
    - email: must match email regex OR be empty/null
    - mob: must be 5+ digits OR be empty/null
    - name OR mob required if slot is non-empty
  RETURNS:
    {
      sanitized: { name: trimmed, mob: digits-only, email: trimmed } | null,
      validation: { isValid: boolean, errors: [ string ] },
      isEmpty: boolean,
      keys: { name: `cname${index}`, mob: `cmob${index}`, email: `cemail${index}` }
    }
```

---

### 8.7 sessionCache.js

**File:** `backend/utils/sessionCache.js`

```
STORAGE: In-memory Map (resets on server restart)
WARNING: Not shared across multiple server instances (use Redis in multi-instance prod)

FUNCTION: setSession(userId, token)
  SIDE_EFFECTS: cache.set(userId, token) — overwrites any prior session
  RETURNS: void

FUNCTION: getSession(userId)
  RETURNS: token string | undefined

FUNCTION: deleteSession(userId)
  SIDE_EFFECTS: cache.delete(userId)
  RETURNS: void
```

---

## 9. Database — Firestore Collections

### Collection: `users`

**Key field:** `userId` (custom string, not Firestore document ID)

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Generated: firstName+DDMM, e.g. "john1503" |
| `email` | string | Stored lowercase |
| `firstName` | string | |
| `lastName` | string | |
| `fatherName` | string | |
| `dob` | string | Format: YYYY-MM-DD |
| `phone` | string | 10 digits |
| `countryCode` | string | e.g. "+91" |
| `city` | string | Lowercase |
| `admin_number` | string | Admin phone number |
| `role` | string | "admin" or "employee" |
| `street` | string | Optional |
| `doorNo` | string | Optional |
| `state` | string | Optional |
| `pincode` | string | Optional |
| `aadhar` | string | Optional |
| `pan` | string | Optional |
| `createdAt` | Timestamp | Firebase server timestamp |
| `approvedAt` | Timestamp | Set when admin approves |
| `isActive` | boolean | |

---

### Collection: `requests`

**Key field:** Firestore auto-generated ID

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | |
| `lastName` | string | |
| `fatherName` | string | |
| `dob` | string | YYYY-MM-DD |
| `email` | string | |
| `phone` | string | 10 digits |
| `city` | string | |
| `status` | string | "pending" \| "approved" \| "rejected" |
| `createdAt` | Timestamp | |
| `processedAt` | Timestamp | Set on approve/reject |
| `processedBy` | string | userId of admin who processed |
| `rejectionReason` | string | Optional |

---

### Collection: `Excel_master`

**Key field:** `ledger_id` (stored as field; Firestore ID is auto-generated)

| Field | Type | Notes |
|---|---|---|
| `ledger_id` | string | `ledger.trim().replace(/\s+/g,'').toUpperCase()` |
| `code` | string | |
| `type` | string | |
| `ledger` | string | UPPERCASE |
| `city` | string | Lowercase |
| `group` | string | |
| `name` | string | |
| `address1` | string | |
| `address2` | string | |
| `address3` | string | |
| `pin` | string | |
| `email` | string | |
| `site` | string | |
| `contact` | string | Primary contact name |
| `phone1` | string | |
| `phone2` | string | |
| `mobile` | string | |
| `resi` | string | |
| `fax` | string | |
| `licence` | string | |
| `tin` | string | |
| `stno` | string | |
| `panno` | string | |
| `mr` | string | |
| `area` | string | |
| `rout` | string | |
| `tpt` | string | |
| `tptdlv` | string | |
| `bank` | string | |
| `bankadd1` | string | |
| `bankadd2` | string | |
| `branch` | string | |
| `crdays` | string/number | Credit days |
| `cramount` | string/number | Credit amount |
| `limitbill` | string | |
| `limitday` | string | |
| `limittype` | string | |
| `freez` | string | |

---

### Collection: `Outstanding_Remainder`

**Key field:** `ledger_id` (stored as field)

| Field | Type | Notes |
|---|---|---|
| `ledger_id` | string | Derived from ledger name |
| `ledger_name` | string | Display name |
| `city` | string | Lowercase |
| `group` | string | |
| `debit` | number | Current outstanding debit |
| `credit` | number | Current outstanding credit |
| `nextCallDate` | string | YYYY-MM-DD or null |
| `lastComments` | array of objects | Max 5 comments. Format: `[{ text: string, date: ISO_timestamp, userId: string }, ...]` |
| `lastUpdatedAt` | Timestamp | Last modification time (legacy — prefer `updatedAt`) |
| `updatedAt` | string | ISO timestamp set on every update |
| `lastTransactionDate` | string | YYYY-MM-DD date from outstanding upload |
| `updatedByUserId` | string | userId of last updater |
| `sourceFileName` | string | Excel file that last updated this |
| `contact` | string | From master data |
| `mobile` | string | From master data |
| `email` | string | From master data |
| `cname1` | string\|null | Customer slot 1 name |
| `cmob1` | string\|null | Customer slot 1 phone |
| `cemail1` | string\|null | Customer slot 1 email |
| `cname2` | string\|null | Customer slot 2 name |
| `cmob2` | string\|null | Customer slot 2 phone |
| `cemail2` | string\|null | Customer slot 2 email |
| `cname3` | string\|null | Customer slot 3 name |
| `cmob3` | string\|null | Customer slot 3 phone |
| `cemail3` | string\|null | Customer slot 3 email |

**lastComments Array Behavior:**
- When a new comment is submitted via PUT /api/ledger-remainder/:ledger_id, the backend appends it with an ISO timestamp
- If comments array reaches 6 items, the oldest (first) comment is removed automatically (FIFO)
- Maximum historical comments retained: 5
- Frontend displays all comments in reverse chronological order with timestamps

**Required Firestore Indexes:**

| Type | Fields | Order | Used By |
|---|---|---|---|
| Composite | `city` ASC, `updatedAt` DESC | — | `list()` with city filter |
| Composite | `city` ASC, `nextCallDate` ASC | — | `getUpcomingRemainders` with city |
| Composite | `nextCallDate` DESC, `ledger_id` ASC | — | `listPaged` (no city filter) |
| Composite | `city` ASC, `nextCallDate` DESC, `ledger_id` ASC | — | `listPaged` with city |

---

### Collection: `Ledger_logs`

**Key field:** Firestore auto-generated ID

| Field | Type | Notes |
|---|---|---|
| `ledger_id` | string | |
| `ledger_name` | string | |
| `group` | string | |
| `city` | string | Lowercase |
| `ldebit` | number | Debit at time of log |
| `lcredit` | number | Credit at time of log |
| `nextCallDate` | string | Date at time of log |
| `date` | string | Call date (YYYY-MM-DD) |
| `comments` | string | Comment at time of log |
| `operation` | string | "insert" or "update" |
| `updatedFields` | array | e.g. ["debit","credit"] or ["nextCallDate"] |
| `timestamp` | Timestamp | Firebase server timestamp |
| `createdByUserId` | string | userId who triggered this log |

---

### Collection: `loginActivities`

**Key field:** Firestore auto-generated ID

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Custom userId |
| `timestamp` | Timestamp | Login time |

**Required Firestore Index:** `userId` ASC, `timestamp` DESC — used by `getLastLogin()`

**Constraint:** Max 2 records per userId (cleanup runs after every login)

---

### Collection: `otps`

**Key field:** Firestore auto-generated ID (queried by email field)

| Field | Type | Notes |
|---|---|---|
| `email` | string | User's email |
| `otp` | string | 6-digit OTP code |
| `createdAt` | Timestamp | |
| `expiresAt` | Timestamp | createdAt + OTP_VALID_TIME seconds |

**Cleanup:** Server-side scheduled job runs every `OTP_VALID_TIME` seconds, deletes expired OTPs (max 100 per run)

---

### Collection: `counters`

**Key field:** Single document with fixed ID `app_stats`

| Field | Type | Notes |
|---|---|---|
| `src_master` | string \| null | Filename of the last Excel master upload |
| `src_master_date` | string | ISO timestamp of last master upload |
| `src_outstanding` | string \| null | Filename of the last outstanding upload |
| `src_outstanding_date` | string | ISO timestamp of last outstanding upload |
| `totalLedgers` | number | Count of documents in `Excel_master` |
| `totaldebit` | number | Sum of `debit` across all `Outstanding_Remainder` docs |
| `totalcredit` | number | Sum of `credit` across all `Outstanding_Remainder` docs |

**Update triggers:** `updateMasterUpload` on master upload, `updateOutstandingUpload` on outstanding upload, `updateLedgerTotals` when remainder debit/credit change.

---

## 10. Frontend — Architecture

### React App Structure

```
main.jsx
  └── <AuthProvider>          (AuthContext — global auth state)
        └── <App />           (React Router BrowserRouter)
              ├── /login       → login.jsx
              ├── /home        → ProtectedRoute → home.jsx
              ├── /view        → ProtectedRoute → view.jsx
              ├── /view-master → ProtectedRoute → view-master.jsx
              ├── /view-outstandings → ProtectedRoute → view-outstandings.jsx
              ├── /view-log    → ProtectedRoute → view-log.jsx
              ├── /notify      → ProtectedRoute → view-notify.jsx
              ├── /view-notify-detail → ProtectedRoute → view-notify-detail.jsx
              ├── /excel       → AdminRoute → excel.jsx
              └── * (404)      → redirect to /login
```

### AuthContext (frontend/src/context/AuthContext.jsx)

```
STATE:
  user: { userId, email, firstName, lastName, role, city } | null
  isLoggedIn: boolean

PERSISTENCE: localStorage key "user"

FUNCTIONS:
  login(userData)
    → sets user in state and localStorage

  logout()
    → clears user from state and localStorage
    → calls POST /api/auth/logout
    → navigates to /login

AUTO-LOGOUT:
  Listens for window event "auth:unauthorized"
  → calls logout() when fired
  → dispatched by apiFetch on any 401 response
```

### apiFetch (frontend/src/utils/api.js)

```
FUNCTION: apiUrl(path)
  → returns VITE_API_URL + path (or just path for same-origin)

FUNCTION: apiFetch(path, options)
  → fetch(apiUrl(path), { credentials: 'include', ...options })
  → on 401: window.dispatchEvent(new Event('auth:unauthorized'))
  → returns Response object
```

### Route Protection

```
ProtectedRoute: checks isLoggedIn
  → if not logged in: redirect to /login

AdminRoute (extends ProtectedRoute): checks role === 'admin'
  → if not admin: redirect to /home
```

---

## 11. Frontend — Routes & Pages

### 11.1 /login — login.jsx

```
ACCESS: Public
FILE: frontend/src/pages/login.jsx

STATE:
  mode: 'login' | 'forgotPassword' | 'otpEntry' | 'resetPassword' | 'register'
  userId, password, email, otp, newPassword, confirmPassword
  formData: { firstName, lastName, fatherName, dob, email, phone, city }
  carouselIndex (hero image slideshow, 14 card images)
  error, successMsg, loading
  otpTimer, resendCooldown

KEY BEHAVIOR:
  1. Login form: submits userId+password → POST /api/auth/login
     → on success: login(user) from AuthContext → navigate to /home
  2. Forgot Password: click → show email input
     → POST /api/password/send-otp → show OTP input with countdown timer
     → POST /api/password/verify-otp → show new password form
     → POST /api/password/reset → show success → back to login
  3. Resend OTP: available after resendCooldown expires
     → POST /api/password/resend-otp
  4. Register: click → show registration form
     → POST /api/signup/register → show success message
  5. Hero carousel: auto-advances every 4s, GSAP fade transitions

API CALLS:
  POST /api/auth/login
  POST /api/password/send-otp
  POST /api/password/resend-otp
  POST /api/password/verify-otp
  POST /api/password/reset
  POST /api/signup/register
```

---

### 11.2 /home — home.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/pages/home.jsx

BIFURCATION BY ROLE:
  admin → shows Admin Dashboard view
  employee → shows Employee Dashboard view

ADMIN VIEW STATE:
  employees: []
  pendingRequests: []
  stats: { employees, pendingRequests }
  deleteConfirm: { userId, name }
  approveConfirm, rejectConfirm

ADMIN VIEW BEHAVIOR:
  1. On mount: GET /api/admin/dashboard → populate employees + pending requests
  2. Approve request: PUT /api/signup/approve/:id → refresh dashboard
  3. Reject request: PUT /api/signup/reject/:id → refresh dashboard
  4. Delete employee: DELETE /api/admin/users/:userId → refresh dashboard
  5. Each employee card shows: name, email, city, role, last login time
  6. Each request card shows: name, email, phone, city, created date + Approve/Reject buttons

EMPLOYEE VIEW STATE:
  reminders from Remainder.jsx widget (embedded component)

EMPLOYEE VIEW BEHAVIOR:
  1. Shows Remainder widget (upcoming call dates for employee's city)
  2. Quick nav cards: View Master, View Outstanding, View Logs, Notify

API CALLS (admin):
  GET    /api/admin/dashboard
  GET    /api/counter
  PUT    /api/signup/approve/:id
  PUT    /api/signup/reject/:id
  PATCH  /api/admin/users/:userId
  DELETE /api/admin/users/:userId

API CALLS (employee):
  (delegated to Remainder.jsx component)
```

---

### 11.3 /view — view.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/pages/view.jsx

KEY BEHAVIOR:
  Navigation hub with 3 cards:
    1. "View Master" → navigate to /view-master
    2. "View Outstanding" → navigate to /view-outstandings
    3. "View Logs" → navigate to /view-log

API CALLS: none
```

---

### 11.4 /view-master — view-master.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/pages/view-master.jsx

STATE:
  rows: []           (raw data from API)
  filtered: []       (after search filter)
  currentPage: 1
  searchText: ''
  expandColumns: false   (show all vs. default subset of columns)
  loading, error

KEY BEHAVIOR:
  1. On mount: GET /api/excel/master/paged (cursor-based, 15 rows per page)
  2. Next page: pass nextCursor as after= query param
  3. Search: client-side text filter across all fields
  4. Expand columns: toggle between default visible columns and all 42 fields
  5. Table shows: ledger_id, code, ledger, city, group, name, contact, mobile, email, ...

API CALLS:
  GET /api/excel/master/paged?after={ledger_id}
```

---

### 11.5 /view-outstandings — view-outstandings.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/pages/view-outstandings.jsx

STATE:
  rows: []
  filtered: []
  currentPage: 1
  searchText: ''
  loading, error

KEY BEHAVIOR:
  1. On mount: GET /api/ledger-remainder/paged (cursor-based, 15 rows per page)
  2. Next page: pass nextCursor JSON as after= query param
  3. Search: client-side filter by ledger_name, city, group
  4. Click row → navigate to /view-notify-detail?ledger_id=...
  5. Table columns: ledger_name, group, city, debit, credit, nextCallDate, lastComments

API CALLS:
  GET /api/ledger-remainder/paged?after={cursor_json}
```

---

### 11.6 /view-log — view-log.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/pages/view-log.jsx

STATE:
  logs: []
  filtered: []
  currentPage: 1
  searchText: ''
  filterType: 'all' | 'debit' | 'credit'
  filterOperation: 'all' | 'insert' | 'update'
  dateFrom, dateTo
  loading, exporting, error

KEY BEHAVIOR:
  1. On mount: GET /api/ledger-logs/paged (cursor-based, 15 rows per page)
  2. Client-side filters:
       - searchText: match ledger_name
       - filterType: show only debit-related or credit-related logs
       - filterOperation: show only inserts or updates
       - Advanced: filter by ledger names, userIds, date ranges
  3. Export button: GET /api/ledger-logs/export?dateFrom=&dateTo=
       → browser download of Excel file
  4. Color coding (mirrors backend Excel export):
       Green   → debit change
       Red     → credit change
       Blue    → nextCallDate change
       Amber   → comment change
  5. Pagination: 20 rows per page (client-side on fetched page)

API CALLS:
  GET /api/ledger-logs/paged?after={timestamp}
  GET /api/ledger-logs/export?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
```

---

### 11.7 /notify — view-notify.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/pages/view-notify.jsx

STATE:
  reminders: []
  loading, error
  refreshKey

KEY BEHAVIOR:
  1. On mount (and on refresh): GET /api/ledger-remainder/upcoming?days=7&limit=50
  2. Shows cards for each upcoming reminder:
       ledger_name, city, nextCallDate, debit, credit, lastComments
  3. Click card → navigate to /view-notify-detail?ledger_id=...
  4. Refresh button reloads data
  5. Shows "No upcoming reminders" if empty

API CALLS:
  GET /api/ledger-remainder/upcoming?days=7&limit=50
```

---

### 11.8 /view-notify-detail — view-notify-detail.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/pages/view-notify-detail.jsx

URL PARAMS: ledger_id (from query string or navigation state)

STATE:
  remainder: {}          (full ledger remainder object)
  logs: []               (recent logs for this ledger)
  editMode: boolean
  form: { nextCallDate, lastComments (string), cname1..3, cmob1..3, cemail1..3 }
  loading, saving, error, successMsg

KEY BEHAVIOR:
  1. On mount: GET /api/ledger-remainder/:ledger_id
               GET /api/ledger-logs/:ledger_id
  2. Display: ledger_name, group, city, debit, credit, nextCallDate,
              lastComments array (up to 5 comments with timestamps),
              3 customer slots (name/phone/email)
  3. Comments view: Shows scrollable list of stored comments (last 5 max)
              Each comment displays text and ISO-formatted date/time
  4. Edit mode: Text area to add new comment (appends to array)
              Shows previous comments below for reference
              When saved, if 6 comments exist, oldest is auto-removed
  5. Save: PUT /api/ledger-remainder/:ledger_id with new comment string + updated fields
  6. Delete customer slot (admin only): DELETE /api/ledger-remainder/:ledger_id/customer/:slot
  7. Logs section: shows recent audit history for this ledger with timestamps

PERMISSIONS ENFORCED IN UI:
  - Non-admin: cannot click "Delete" on occupied customer slots (button hidden)
  - Non-admin: cannot overwrite an occupied customer slot (handled by backend too)

API CALLS:
  GET    /api/ledger-remainder/:ledger_id
  PUT    /api/ledger-remainder/:ledger_id
  DELETE /api/ledger-remainder/:ledger_id/customer/:slot
  GET    /api/ledger-logs/:ledger_id
```

---

### 11.9 /excel — excel.jsx

```
ACCESS: Admin only
FILE: frontend/src/pages/excel.jsx

STATE:
  activeTab: 'master' | 'outstanding'
  file: File | null
  dragging: boolean
  uploading, progress (0-100), uploadSpeed
  result: { message, inserted, updated, ... } | null
  error

KEY BEHAVIOR:
  1. Two tabs: Upload Master Data, Upload Outstanding Data
  2. File input: drag-drop or click-to-browse
     Accepts: .xlsx, .xls, .csv
  3. Upload process:
     a. Create FormData with file
     b. Use XHR (XMLHttpRequest) for progress tracking:
          onprogress event → update progress bar (0-60% for transfer)
          server processing estimate → 60-100%
     c. Show upload speed (bytes/sec)
  4. On success: show result stats (inserted, updated, logsCreated, etc.)
  5. On error: show error message with details

API CALLS:
  POST /api/excel/master/upload       (FormData, file field)
  POST /api/excel/outstanding/upload  (FormData, file field)
```

---

### 11.10 /profile — userprofile.jsx

```
ACCESS: Protected (any role)
FILE: frontend/src/components/userprofile.jsx
ROUTE: /profile (rendered via Dashboard wrapper)

STATE:
  profile: {}         (current user data)
  editForm: {}        (editable fields)
  pwForm: { oldPassword, newPassword, confirmPassword }
  editMode: boolean
  changingPassword: boolean
  loading, saving, error, successMsg

KEY BEHAVIOR:
  1. On mount: GET /api/user/profile
  2. Display all profile fields: name, dob, email, phone, city, address, aadhar, pan
  3. Edit mode: allows updating firstName, lastName, fatherName, dob, email, phone,
               countryCode, city, street, doorNo, state, pincode, aadhar, pan
  4. Save profile: PUT /api/user/profile
  5. Change password section:
       → enter oldPassword, newPassword, confirmPassword
       → PUT /api/user/password
  6. Validation done in UI before submit (same rules as backend)

API CALLS:
  GET /api/user/profile
  PUT /api/user/profile
  PUT /api/user/password
```

---

## 12. Frontend — Components

### Alert.jsx

```
FILE: frontend/src/components/Alert.jsx
PURPOSE: Modal dialog overlay for user feedback

VARIANTS:
  'success'   → green icon, message, OK button
  'error'     → red icon, message, OK button
  'warning'   → yellow icon, message, Confirm + Cancel buttons
  'loading'   → spinner, message (no buttons)
  'uploading' → progress bar, upload speed, file name, Cancel button

PROPS:
  type: 'success' | 'error' | 'warning' | 'loading' | 'uploading'
  message: string
  onConfirm: () => void
  onCancel: () => void
  progress: number (0-100, for 'uploading' type)
  uploadSpeed: string (e.g. "256 KB/s")
  fileName: string
```

---

### Button.jsx

```
FILE: frontend/src/components/Button.jsx
PURPOSE: Shared interactive UI elements

EXPORTS:
  AnimatedButton
    PROPS: label, onClick, disabled, variant ('primary'|'secondary'|'danger')
    BEHAVIOR: ripple animation on click

  Dropdown
    PROPS: options [{value,label}], value, onChange, placeholder
    BEHAVIOR: styled select input, used for city and country code selectors

  SearchBar
    PROPS: value, onChange, placeholder
    BEHAVIOR: text input with search icon

  Pagination
    PROPS: currentPage, totalPages, onPageChange
    BEHAVIOR: prev/next + page number buttons

  ExpandColumnsButton
    PROPS: expanded, onToggle
    BEHAVIOR: toggle button to show/hide extra table columns

  cityOptions: array of { value, label } for Indian cities
  COUNTRY_OPTIONS: array of { value, label } for country dial codes
```

---

### datepicker.jsx

```
FILE: frontend/src/components/datepicker.jsx
PURPOSE: Calendar widget for date selection

PROPS:
  value: string (YYYY-MM-DD)
  onChange: (dateStr) => void
  minDate, maxDate: string (YYYY-MM-DD)
  disabled: boolean

BEHAVIOR:
  - Renders month grid
  - Keyboard navigation (arrow keys, Enter, Escape)
  - Returns selected date as YYYY-MM-DD string
```

---

### Table.jsx

```
FILE: frontend/src/components/Table.jsx
PURPOSE: Reusable sortable data table

PROPS:
  columns: [ { key, label, visible? } ]
  rows: [ {...data} ]
  onRowClick: (row) => void
  visibleColumns: string[] (override)

BEHAVIOR:
  - Click column header → sort ASC/DESC
  - Click row → calls onRowClick
  - Highlights alternating rows
```

---

### sidebar.jsx

```
FILE: frontend/src/components/sidebar.jsx
PURPOSE: Navigation sidebar

NAV ITEMS:
  Always visible:
    Home (/home), View (/view), Notify (/notify), Profile (/profile), Logout

  Admin only:
    Excel (/excel)

BEHAVIOR:
  - Active item highlighted
  - Logout calls AuthContext.logout()
  - Collapsible on mobile
```

---

### Dashboard.jsx

```
FILE: frontend/src/components/Dashboard.jsx
PURPOSE: Page layout wrapper with sidebar + top nav bar

PROPS:
  children: React nodes (page content)
  activeTab: string (nav item to highlight)
  title: string (page title in top bar)

BEHAVIOR:
  - Renders sidebar + top bar + main content area
  - Top bar shows user name + role + logout button
  - Responsive: sidebar collapses on narrow viewports
```

---

### loader.jsx / loading.jsx

```
FILES:
  frontend/src/components/loader.jsx   — inline spinner (for buttons/sections)
  frontend/src/components/loading.jsx  — full-page overlay spinner

PROPS: message (optional string)
BEHAVIOR: CSS animation spinner, blocks interaction in full-page mode
```

---

## 13. Security Model

### 13.1 Authentication — JWT + HttpOnly Cookie

```
MECHANISM:
  1. On login: server generates JWT → sets as HttpOnly cookie named 'token'
  2. Cookie attributes:
       httpOnly: true     → JS cannot read → XSS protected
       secure: true       → HTTPS only (in production)
       sameSite: 'strict' → CSRF protected
       maxAge: JWT_EXPIRES_IN (60 minutes)
  3. Every protected request: browser auto-sends cookie
  4. Server middleware: reads cookie → verifies JWT → checks session cache

SESSION CACHE:
  - In-memory Map: userId → token
  - New login overwrites previous session (single active session per user)
  - Prevents replayed old tokens: if token != cache[userId] → 401
  - Cleared on logout
  - WARNING: resets on server restart (sessions invalidated)

JWT PAYLOAD: { userId, email, role, firstName, city, iat }
EXPIRY: configurable via JWT_EXPIRES_IN (default 60m)
SECRET: JWT_SECRET env var (must be strong in production)
```

---

### 13.2 Authorization

```
ROLE-BASED ACCESS:
  - admin middleware wraps all admin-only endpoints
  - Checked after auth middleware (req.user must exist)
  - 403 returned for insufficient role

CITY-BASED SCOPING:
  - Non-admin users: all list/export queries filter by req.user.city
  - Applied in: Outstanding_Remainder, Ledger_logs, upcoming reminders
  - City stored as lowercase; comparison is case-insensitive

CUSTOMER SLOT PROTECTION:
  - A non-admin cannot overwrite an already-occupied customer slot
  - Checked in PUT /api/ledger-remainder/:ledger_id controller
  - If cname{n}/cmob{n}/cemail{n} already has a value:
      AND requester is not admin → 403
  - Admin can always overwrite or delete any slot
```

---

### 13.3 CORS

```
CONFIGURATION:
  origin: process.env.CORS_ORIGIN (exact string match)
  credentials: true (required for HttpOnly cookie cross-origin)
  methods: GET, POST, PUT, DELETE
  allowedHeaders: Content-Type, Authorization

BEHAVIOR:
  - Requests from other origins → blocked at CORS preflight
  - Dev: CORS_ORIGIN = http://localhost:3000
  - Prod: CORS_ORIGIN = Firebase App Hosting domain
```

---

### 13.4 Password Security

```
STORAGE: Firebase Authentication (bcrypt internally — managed by Google)

CHANGE PASSWORD FLOW:
  1. Verify old password via Firebase REST API (not just local check)
  2. newPassword min 6 chars
  3. newPassword !== oldPassword
  4. newPassword === confirmPassword
  5. Update via Firebase Auth SDK

OTP RESET FLOW:
  - 6-digit numeric OTP
  - Stored in Firestore 'otps' collection with expiry timestamp
  - Expires in OTP_VALID_TIME seconds (default: 120s = 2 min)
  - Resend cooldown: OTP_RESEND_TIME seconds (default: 60s)
  - Deleted from Firestore immediately after successful use
  - Server-side cleanup job removes expired OTPs every OTP_VALID_TIME seconds
```

---

### 13.5 File Upload Security

```
CONSTRAINTS:
  - Max file size: 15 MB (multer limit)
  - Allowed MIME types: .xlsx, .xls, .csv only
  - Storage: in-memory buffer (req.file.buffer) — no disk writes
  - No path traversal risk (file never written to disk)
  - Admin-only endpoints — double-protected by auth + admin middleware
```

---

### 13.6 Input Validation Summary

| Field | Rule | Where |
|---|---|---|
| Phone (user registration) | Exactly 10 digits | signup controller |
| Phone (customer slot) | Min 5 digits | customerValidator.js |
| Email | Standard RFC regex | controller + customerValidator |
| Password | Min 6 chars | password controller |
| Date | YYYY-MM-DD format | ledgerRemainder controller |
| ledger_id | No spaces, uppercase | excelParser + outstandingParser |
| City | Lowercase | excelParser, userService |
| File size | Max 15 MB | multer config |
| File type | .xlsx/.xls/.csv | multer mimetype filter |

---

## 14. End-to-End Data Flows

### Flow 1: User Registration → Admin Approval → First Login

```
Step 1: New user fills registration form at /login
  → POST /api/signup/register
    { firstName, lastName, fatherName, dob, email, phone, city }

Step 2: controller.register validates
  → phone 10 digits check
  → registrationService.findByPhone(phone)   — check no duplicate in 'requests'
  → userService.findByPhone(phone)           — check no duplicate in 'users'
  → registrationService.findByEmail(email)   — check not already requested
  → if all pass: registrationService.createRequest(data)
    → Firestore 'requests' ← new document { ...data, status:'pending' }
  → mailer.sendEmailToAdmin(...)             [fire-and-forget]
  → Response: { requestId }

Step 3: Admin visits /home
  → GET /api/admin/dashboard
    → registrationService.getPendingRequests()
    → new request appears in pendingRequests list

Step 4: Admin clicks "Approve" on the request
  → PUT /api/signup/approve/:id
    → registrationService.findById(id)            — verify exists and pending
    → generator.generateRandomCredentials(firstName, fatherName, dob)
        userId   = firstName.toLowerCase() + DDMM(dob)   e.g. "john1503" (deterministic)
        password = cryptographically random 12-char string  (random each time)
    → Firebase Auth: admin.auth().createUser({ email, password })
    → userService.createUser({ ...data, userId, role:'employee' })
        → Firestore 'users' ← new document
    → registrationService.deleteRequest(id)
        → Firestore 'requests' ← document deleted
    → mailer.sendCredentialsEmail({ email, userId, password }) [fire-and-forget]
    → Response: { userId }

Step 5: Employee receives email with userId + password
  → Goes to /login
  → Fills userId + password
  → POST /api/auth/login
    → userService.findByUserId(userId)            — get user from 'users'
    → Firebase REST: verifyPassword(email, password)
    → jwt.generateToken(userId, email, role, firstName, city)
    → sessionCache.setSession(userId, token)
    → activityService.recordLogin(userId)          — write to 'loginActivities'
    → Set HttpOnly cookie
    → Response: { user: {...} }
  → AuthContext.login(user) → localStorage → navigate to /home
```

---

### Flow 2: Excel Master Upload → Ledger Seeding

```
Step 1: Admin selects .xlsx file at /excel (Master tab)
  → XHR POST /api/excel/master/upload (multipart FormData)
  → Upload progress: 0% → 60% (file transfer)

Step 2: Backend receives file buffer
  → excelParser.parseExcelMasterBuffer(buffer)
    → xlsx.read(buffer)
    → detect header row, normalize column names
    → map rows to EXCEL_MASTER_FIELDS (42 fields)
    → generate ledger_id per row: ledger.trim().replace(/\s+/g,'').toUpperCase()
    → return { records: [...] }

Step 3: excelMasterService.bulkInsert(records, meta)
  → fetch all existing 'Excel_master' documents
  → deduplicate input records by ledger_id (last wins)
  → for each record:
      if ledger_id not in existing → INSERT (new doc in 'Excel_master')
      if ledger_id exists and fields changed → UPDATE
      track inserted + updated counts
  → Firestore batch writes (max 400/batch)
  → Firestore 'Excel_master' ← N new/updated documents

Step 4: ledgerRemainderService.upsertFromExcelRecords(records, meta)
  → for each unique ledger in records:
      query 'Outstanding_Remainder' by ledger_id
      if NOT exists:
        → CREATE new document:
          { ledger_id, ledger_name, city, group, contact, mobile, email,
            debit: 0, credit: 0, nextCallDate: null, lastComments: null }
          Firestore 'Outstanding_Remainder' ← new document
      if EXISTS:
        → UPDATE city/group/contact/mobile/email fields
        → PRESERVE existing debit, credit, nextCallDate, lastComments
          Firestore 'Outstanding_Remainder' ← updated document

Step 5: Response returned
  → { message, inserted, updated, fileName }
  → Progress bar → 100%

Step 6: Employee views data at /view-master
  → GET /api/excel/master?limit=1000
  → Table populated with imported records
```

---

### Flow 3: Outstanding Upload → Balance Update → Audit Log

```
Step 1: Admin selects outstanding .xlsx file at /excel (Outstanding tab)
  → XHR POST /api/excel/outstanding/upload

Step 2: outstandingParser.parseOutstandingBuffer(buffer)
  → detect LEDGER, GROUP, DEBIT, CREDIT, DATE, COMMENTS columns
  → parse date: Excel serial | ISO | DD/MM/YYYY → YYYY-MM-DD
  → parse debit/credit as numbers
  → return { validRecords: [...], invalidRecords: [...] }

Step 3: For each validRecord: generate ledger_id

Step 4: Validate against 'Excel_master'
  → fetch all ledger_ids from 'Excel_master'
  → records not found → added to notFound list, skipped

Step 5: outstanding.processOutstandingRecords(validRecords, userId, fileName)
  For each valid record:
    Step 5a: ledgerRemainderService.getByLedgerId(ledger_id)
             → fetch current 'Outstanding_Remainder' document

    Step 5b: Compare new values vs. stored values
             → if debit UNCHANGED AND credit UNCHANGED AND date UNCHANGED AND comments UNCHANGED:
                 SKIP (no write, no log)

    Step 5c: If any value changed:
             → ledgerRemainderService.updateByLedgerId(ledger_id, {
                 debit: newDebit, credit: newCredit,
                 date: newDate, comments: newComments,
                 updatedByUserId: userId, sourceFileName: fileName
               })
               Firestore 'Outstanding_Remainder' ← updated

             → determine updatedFields array (e.g. ['debit','credit'])
             → ledgerLogsService.addLog({
                 ledger_id, ledger_name, group, city,
                 ldebit: newDebit, lcredit: newCredit,
                 nextCallDate: existing, date: newDate, comments: newComments,
                 operation: 'update', updatedFields,
                 createdByUserId: userId
               })
               Firestore 'Ledger_logs' ← new audit document

Step 6: Response: { processed, updated, logsCreated, found, notFound, fileName }

Step 7: Employee views logs at /view-log
  → Color-coded: green (debit change), red (credit change), blue (date), amber (comments)
```

---

### Flow 4: Ledger Remainder Update → Call Scheduling

```
Step 1: Employee clicks ledger at /view-outstandings (or /notify)
  → navigate to /view-notify-detail?ledger_id=LEDGERID

Step 2: Page mounts
  → GET /api/ledger-remainder/LEDGERID
    → ledgerRemainderService.getByLedgerId(ledger_id)
    → Response: full remainder object
  → GET /api/ledger-logs/LEDGERID
    → ledgerLogsService.getLogsByLedgerId(ledger_id)
    → Response: recent audit logs

Step 3: Employee fills form
  → nextCallDate: picks date from datepicker (YYYY-MM-DD)
  → lastComments: types comment text
  → Customer slots: enters cname/cmob/cemail for up to 3 contacts

Step 4: Employee clicks Save
  → PUT /api/ledger-remainder/LEDGERID
    { nextCallDate, lastComments, cname1..3, cmob1..3, cemail1..3 }

Step 5: Backend validation
  → customerValidator.processCustomerData(1, { cname1, cmob1, cemail1 }) ×3
  → if non-admin AND slot already has data → 403

Step 6: ledgerRemainderService.updateByLedgerId(ledger_id, validatedData)
  Firestore 'Outstanding_Remainder' ← updated document

Step 7: If nextCallDate or lastComments changed vs. previous values:
  → ledgerLogsService.addLog({
      operation: 'update',
      updatedFields: ['nextCallDate'] | ['comments'] | both,
      ...snapshot values
    })
  Firestore 'Ledger_logs' ← new audit document

Step 8: Response: { success, data, updatedFields }
  → Page shows success message, refreshes display

Step 9: Next time /home or /notify loads:
  → GET /api/ledger-remainder/upcoming?days=7
    → Outstanding_Remainder WHERE nextCallDate BETWEEN today AND today+7
    → This ledger now appears in reminders if nextCallDate is within 7 days
```

---

### Flow 5: Password Reset via OTP

```
Step 1: User at /login clicks "Forgot Password?"
  → mode → 'forgotPassword'
  → User enters email

Step 2: Click "Send OTP"
  → POST /api/password/send-otp { email }
    → userService.findByEmail(email)         — verify email registered
    → otpService.findMostRecent(email)        — check 60s cooldown
    → generate 6-digit OTP
    → otpService.create(email, otp)
        → deleteByEmail(email)               — remove old OTP
        Firestore 'otps' ← new document { email, otp, createdAt, expiresAt }
    → mailer.sendOtpEmail({ email, firstName, otp }) [fire-and-forget]
  → Response: { otpExpirationSeconds: 120, resendOtpSeconds: 60 }
  → UI shows 120s countdown, 60s resend cooldown

Step 3: User checks email, enters 6-digit OTP
  → POST /api/password/verify-otp { email, otp }
    → otpService.findValidOtp(email)          — expiresAt > now
    → check otp string match
  → Response: { success: true }
  → mode → 'resetPassword'

Step 4: User enters new password
  → POST /api/password/reset { email, otp, newPassword }
    → userService.findByEmail(email)          — get Firebase uid
    → otpService.verify(email, otp)           — re-verify OTP (double-check)
    → Firebase Auth: updateUser(uid, { password: newPassword })
    → otpService.deleteByEmail(email)         — clean up OTP
    Firestore 'otps' ← document deleted
  → Response: { success: true }
  → UI shows success → navigate back to login form

Step 5 (cleanup): OTP cleanup job (runs every 120s)
  → otpService.cleanupExpired()
  → Firestore 'otps' ← deletes docs where expiresAt < now (max 100/run)
```

---

### Flow 6: Admin Dashboard Load

```
Step 1: Admin navigates to /home
  → GET /api/admin/dashboard

Step 2: adminDashboard.controller.getDashboard
  → userService.getAllUsers()
    Firestore 'users' ← read all documents
    returns: all employees + admins

  → activityService.getAllLastLogins()
    Firestore 'loginActivities' ← single full collection read
    builds in-memory Map<userId → most-recent record>
    returns: Map<userId → { date, time, timestamp } | undefined>

  → registrationService.getPendingRequests()
    Firestore 'requests' ← where status=='pending'
    returns: pending request list

Step 3: Assemble response
  → filter users to employees (role !== 'admin' or all based on controller logic)
  → merge lastLogin from activity Map into each employee
  → sort employees alphabetically by firstName
  → format pendingRequests with createdAt as ISO string

Step 4: Response:
  {
    stats: { employees: N, pendingRequests: M },
    employees: [ { empId, name, email, phone, city, role, lastLogin } ],
    pendingRequests: [ { id, name, email, phone, city, createdAt } ]
  }

Step 5: Frontend renders
  → Employee cards with last login times
  → Pending request cards with Approve/Reject buttons
```

---

### Flow 7: Export Ledger Logs to Excel

```
Step 1: User at /view-log sets date range (dateFrom, dateTo)
  → clicks "Export" button

Step 2: Browser navigates to (or fetches):
  GET /api/ledger-logs/export?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD

Step 3: ledgerLogsService.exportByDateRange({ dateFrom, dateTo, city })
  Firestore 'Ledger_logs'
    ← where timestamp >= dateFrom (start of day)
    ← where timestamp <= dateTo (end of day)
    [← where city == req.user.city (if employee)]
  returns: array of log objects

Step 4: Build Excel with ExcelJS
  → create workbook + worksheet
  → write header row (styled: bold, gray background)
  → for each log row:
      write cells
      apply color fill based on updatedFields:
        'debit'        → green fill (#c6efce)
        'credit'       → red fill (#ffc7ce)
        'nextCallDate' → blue fill (#bdd7ee)
        'comments'     → amber fill (#ffeb9c)
  → set column widths

Step 5: Stream Excel buffer to response
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="ledger-logs-2026-04-14.xlsx"
  → browser auto-downloads file
```

---

## 15. Deployment

### Firebase App Hosting

**Config file:** `apphosting.yaml`

```yaml
runtime: nodejs20

build:
  commands:
    - npm install
    - npm run build      # runs frontend Vite build → /frontend/dist

run:
  command: npm start     # node backend/server.js

runConfig:
  cpu: 1
  memory: 512Mi
  minInstances: 0        # scales to zero when idle
  maxInstances: 30
  concurrency: 60        # requests per instance before scaling
```

### Infrastructure

| Component | Technology | Notes |
|---|---|---|
| Hosting | Firebase App Hosting | Cloud Run under the hood |
| Database | Firestore (GCP) | Database ID: 'development' or 'production' |
| Auth | Firebase Authentication | Managed by Google |
| Secrets | Google Secret Manager | JWT_SECRET, EMAIL_USER, EMAIL_PASSWORD, FIREBASE_API_KEY |
| Project ID | i-services-crm | `.firebaserc` |
| Production URL | threeiservices-crm-dev--i-services-crm.asia-southeast1.hosted.app | |

### Session Cache Caveat

The in-memory session cache (`backend/utils/sessionCache.js`) is a plain JavaScript Map. With `minInstances: 0` (scale to zero) and `maxInstances: 30`, multiple instances may run simultaneously and each has its own cache. **In multi-instance deployments, a user's session may fail on requests that hit a different instance.** For production scale, replace with a shared Redis instance or Firebase Firestore-backed session store.

### Build Pipeline

```
Developer pushes to GitHub
  ↓
Firebase App Hosting auto-detects push
  ↓
Runs: npm install (root)
  ↓
Runs: npm run build → Vite builds frontend/src → frontend/dist
  ↓
Deploys container to Cloud Run
  ↓
node backend/server.js starts
  → serves frontend/dist as static files
  → serves /api/* routes as Express API
```

---

## 16. Error Code Reference

| HTTP Code | Condition | Example Message |
|---|---|---|
| `200` | Success | "Login successful" |
| `201` | Resource created | "Registration request submitted successfully." |
| `400` | Validation failure / bad input | "Phone number must be exactly 10 digits." |
| `400` | Parse error | "Unable to parse Excel file: no valid headers found." |
| `401` | No auth token | "No token provided." |
| `401` | Token expired | "Invalid or expired token." |
| `401` | Session superseded | "Session superseded. Please log in again." |
| `401` | Wrong credentials | "Invalid credentials." |
| `403` | Not admin | "Access denied. Admin only." |
| `403` | City restriction | "Access denied. Data not in your city." |
| `403` | Slot permission | "Only admin can edit an occupied customer slot." |
| `404` | Resource not found | "User not found." / "Ledger ID not found." |
| `409` | Conflict / duplicate | "Phone number already registered." |
| `409` | Already processed | "Request has already been approved." |
| `413` | File too large | "File exceeds 15 MB limit." |
| `429` | Rate limited | "Please wait 45 seconds before requesting a new OTP." |
| `500` | Server error | "Internal server error." |

---


