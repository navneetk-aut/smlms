# SMLMS — Smart Mobile Library Management System

Milestone 2 prototype for **COMP826 Mobile Systems** (Developer role). A full-stack mobile library app built with Expo (React Native) + FastAPI + MongoDB following the MVVM architecture outlined in Milestone 1.

Final report: [`MILESTONE_2_REPORT.pdf`](./MILESTONE_2_REPORT.pdf)

---

## Features

**Student**
- JWT-based email/password login & registration
- Home dashboard with active loans, trending picks, and quick actions
- Search catalog by title/author/ISBN with category chip filters
- Book details with location, availability, borrow & reserve CTAs
- My Library — segmented Active / History / Holds with pull-to-refresh and overdue badges
- Mock QR scanner (full-screen modal, swap to `expo-camera` for real decoding)
- Notifications feed (borrow confirmations, reservation queue updates)
- Profile with a digital library card (barcode strip)

**Librarian**
- Dashboard with KPI tiles (books, students, active loans, pending reservations)
- Manage Books — searchable list with add / edit / delete modal
- Active Loans with one-tap Return (auto-promotes the next reservation to *ready*)
- Reservations overview

---

## Tech stack

- **Frontend**: Expo SDK 57, Expo Router 57, React Native 0.86, React Query 5, expo-image, expo-blur, expo-haptics, @react-native-vector-icons/feather, SecureStore + AsyncStorage.
- **Backend**: FastAPI, motor 3.3.1 (async MongoDB), passlib[bcrypt], PyJWT, Pydantic 2.
- **Data**: MongoDB with UUID string ids. Idempotent seed of 20 realistic books and 2 test users.

Architecture is MVVM:
- **Model** → Pydantic schemas + Mongo collections in `backend/server.py`
- **ViewModel** → `frontend/src/api.ts` and `frontend/src/auth-context.tsx`
- **View** → Expo Router screens under `frontend/app/`, theme tokens in `frontend/src/theme.ts`

---

## Running locally

### Prerequisites
- Node 18+ and `yarn`
- Python 3.11+
- A running MongoDB instance (local `mongod` on `:27017` is fine)

### 1. Clone and configure

```bash
git clone https://github.com/navneetk-aut/smlms.git
cd smlms
cp backend/.env.example backend/.env   # then edit JWT_SECRET to any long random string
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

On first start the backend will seed 20 books and the two test accounts (idempotent — safe to restart).

### 3. Start the frontend

```bash
cd frontend
yarn install
yarn start
```

Scan the QR with **Expo Go** on your phone, press `a` for Android emulator, `i` for iOS simulator, or `w` for web preview. The frontend reads the backend URL from `frontend/.env`'s `EXPO_PUBLIC_BACKEND_URL`.

---

## Test credentials (seeded on first backend start)

| Role | Email | Password |
|---|---|---|
| Student | `student@smlms.edu` | `Student123!` |
| Librarian | `librarian@smlms.edu` | `Librarian123!` |

Public registration always creates a **student**; the librarian seat exists only via the server-side seed, which keeps privilege escalation off the attack surface.

---

## Project layout

```
smlms/
├── backend/
│   ├── server.py              # FastAPI app, routes, seed, auth
│   ├── requirements.txt
│   ├── .env.example           # copy to .env and edit JWT_SECRET
│   └── tests/                 # pytest suite (22 cases)
├── frontend/
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/            # login, register
│   │   ├── (tabs)/            # home, search, library, profile
│   │   ├── book/[id].tsx      # dynamic book detail
│   │   ├── librarian/         # dashboard, manage-books, loans, reservations
│   │   ├── scan.tsx           # mock QR
│   │   └── notifications.tsx
│   ├── src/
│   │   ├── api.ts             # typed HTTP client
│   │   ├── auth-context.tsx   # session state
│   │   └── theme.ts           # design tokens
│   └── package.json
├── design_guidelines.json     # tokens from the design agent
├── MILESTONE_2_REPORT.md      # editable source of the report
└── MILESTONE_2_REPORT.pdf     # final 8-page submission PDF
```

---

## Testing

```bash
cd backend && pytest -v              # 22 cases: auth, borrow, reserve, roles, seed idempotency
```

Frontend end-to-end flows were verified via Playwright against the preview URL — see Section 5 of the report.
