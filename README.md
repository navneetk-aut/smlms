# SMLMS — Smart Mobile Library Management System

Milestone 2 prototype for COMP826 Mobile Systems. A full-stack mobile library app built with Expo (React Native) + FastAPI + MongoDB following the MVVM architecture outlined in Milestone 1.

## Features
- **Student**: Login/Register (JWT), Home dashboard with active loans + featured books, Search with category chips, Book details, Borrow & Reserve flow, My Library (Active / History / Holds), Mock QR scanner, Notifications, Profile with digital library card.
- **Librarian**: Dashboard with stats, Manage books (CRUD), Approve returns on active loans, View all reservations.

## Tech
- Frontend: Expo Router, React Native 0.86, React Query, expo-image, expo-blur, @react-native-vector-icons/feather, SecureStore + AsyncStorage via internal storage utility.
- Backend: FastAPI, motor (async MongoDB), passlib[bcrypt], PyJWT.
- Data: MongoDB with UUID string ids. Idempotent seed of 20 realistic books and 2 test users.

## Running
Backend auto-starts via supervisor on `:8001` and is reverse-proxied via `/api/*`.
Frontend served by Metro on `:3000` with web preview and QR code for Expo Go.

Test credentials: see `/app/memory/test_credentials.md`.

## Architecture (MVVM)
- **Model**: Mongo collections (users, books, loans, reservations, notifications) exposed as Pydantic schemas.
- **ViewModel**: `src/api.ts` + `src/auth-context.tsx` — single source of truth for state and server interactions.
- **View**: screens under `app/` (expo-router), themed via `src/theme.ts`.
