# SMLMS — Smart Mobile Library Management System

## Problem
University students need a mobile-first way to discover, borrow, reserve, and track library books without visiting the physical library or using the existing clunky web portal. Librarians need a lightweight tool to curate the catalog and manage returns on the go.

## Users
- **Student** (default role on public registration): browse, search, borrow, reserve, scan QR, view digital library card, check notifications.
- **Librarian** (seeded only): all student capabilities plus manage catalog (CRUD), approve returns, view reservations and stats.

## Milestone 2 Scope — Delivered
- Email + password authentication with JWT bearer, bcrypt password hashing, SecureStore/AsyncStorage client-side token.
- Idempotent seed of 20 realistic books across 9 categories + 2 test accounts (student & librarian).
- Student flows: Login/Register → Home dashboard (active loans + trending picks + quick actions + QR FAB) → Search (query + category chips) → Book details (cover, metadata, availability) → Borrow / Reserve (with queue position) → My Library (Active/History/Holds segmented) → Notifications → Profile (digital library card).
- Librarian flows: Dashboard with KPI stats → Manage Books (list/add/edit/delete with modal) → Active Loans with Return action → Reservations list.
- Mock QR Scanner: full-screen modal that simulates a scan and routes to a random seeded book.
- Design: Editorial academic palette (deep burgundy + warm ivory + amber), Playfair Display + DM Sans typography, bottom tab navigation (Home, Search, Library, Profile), sticky Borrow/Reserve CTA on Book Details.

## Architecture (MVVM)
- **Model**: FastAPI + motor over MongoDB. Collections: `users`, `books`, `loans`, `reservations`, `notifications`. All documents use UUID string ids; `_id` excluded from responses to prevent BSON serialization issues.
- **ViewModel**: `src/api.ts` (typed HTTP client, token injection, error normalization) and `src/auth-context.tsx` (session state, sign-in/up/out, refresh).
- **View**: Expo Router screens under `/app`, themed via `src/theme.ts`.

## Tech Stack
- Expo SDK 57, Expo Router 57, React Native 0.86, React Query 5, expo-image, expo-blur, expo-linear-gradient, expo-font (Playfair Display + DM Sans), @react-native-vector-icons/feather, @gorhom/bottom-sheet replaced with native Modal for simplicity.
- FastAPI, motor 3.3.1, passlib[bcrypt], PyJWT.

## Non-functional
- All auth routes protected via HTTPBearer dependency with role-based gating (student/librarian).
- Idempotent startup seed by email (users) and ISBN (books).
- Safe area handling via `useSafeAreaInsets()` on every screen.

## Known Limitations
- QR scanner is mocked (random pick) to keep Expo Go friendly; a real scanner can swap in `expo-camera` without any API changes.
- Email delivery for due-date notifications is persisted to the `notifications` collection only (no push/email in prototype).
- No pagination on book lists (<=200 per request); fine for the 20-book seed.

## Test Credentials
See `/app/memory/test_credentials.md`.
