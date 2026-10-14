"""
Smart Mobile Library Management System (SMLMS) - Backend API
FastAPI + MongoDB (motor). JWT auth with bcrypt via passlib.
All MongoDB documents use UUID string ids; _id is excluded from responses.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated, List, Optional

import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from jwt.exceptions import InvalidTokenError

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("JWT_SECRET", "smlms-dev-secret-change-in-prod-2026")
JWT_ALGO = "HS256"
TOKEN_MINUTES = 60 * 24 * 7  # 7 days

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

app = FastAPI(title="SMLMS API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smlms")


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat() if isinstance(dt, datetime) else dt


# -----------------------------------------------------------------------------
# Pydantic models
# -----------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    student_id: Optional[str] = None
    created_at: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    student_id: Optional[str] = None


class BookIn(BaseModel):
    title: str
    author: str
    category: str
    isbn: Optional[str] = None
    description: str = ""
    cover_url: str = ""
    location: str = "Main Shelf"
    total_copies: int = 1


class BookOut(BaseModel):
    id: str
    title: str
    author: str
    category: str
    isbn: Optional[str] = None
    description: str
    cover_url: str
    location: str
    total_copies: int
    available_copies: int
    rating: float = 4.5


class LoanOut(BaseModel):
    id: str
    book_id: str
    book: Optional[BookOut] = None
    user_id: str
    borrowed_at: str
    due_at: str
    returned_at: Optional[str] = None
    status: str  # active | returned | overdue


class ReservationOut(BaseModel):
    id: str
    book_id: str
    book: Optional[BookOut] = None
    user_id: str
    created_at: str
    queue_position: int
    status: str  # waiting | ready | fulfilled | cancelled


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    kind: str
    read: bool
    created_at: str


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def strip_mongo(doc: dict) -> dict:
    if doc is None:
        return doc
    doc = {k: v for k, v in doc.items() if k != "_id"}
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = iso(v)
    return doc


def make_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": now(),
        "exp": now() + timedelta(minutes=TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]
) -> dict:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "Not authenticated")
    try:
        claims = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = claims.get("sub")
    except InvalidTokenError:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(401, "User no longer exists")
    return user


def require_role(*roles: str):
    async def dep(user: Annotated[dict, Depends(current_user)]) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient role")
        return user

    return dep


def user_public(u: dict) -> UserOut:
    return UserOut(
        id=u["id"],
        email=u["email"],
        name=u["name"],
        role=u["role"],
        student_id=u.get("student_id"),
        created_at=iso(u["created_at"]) if isinstance(u["created_at"], datetime) else u["created_at"],
    )


async def book_public(b: dict) -> BookOut:
    active = await db.loans.count_documents({"book_id": b["id"], "status": "active"})
    avail = max(0, b.get("total_copies", 1) - active)
    return BookOut(
        id=b["id"],
        title=b["title"],
        author=b["author"],
        category=b["category"],
        isbn=b.get("isbn"),
        description=b.get("description", ""),
        cover_url=b.get("cover_url", ""),
        location=b.get("location", "Main Shelf"),
        total_copies=b.get("total_copies", 1),
        available_copies=avail,
        rating=b.get("rating", 4.5),
    )


# -----------------------------------------------------------------------------
# Auth routes
# -----------------------------------------------------------------------------
@api.post("/auth/register", response_model=TokenOut, status_code=201)
async def register(data: RegisterIn):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": email,
        "name": data.name.strip(),
        "role": "student",
        "student_id": f"S{uid[:6].upper()}",
        "password_hash": pwd_ctx.hash(data.password),
        "created_at": now(),
    }
    await db.users.insert_one(doc)
    return TokenOut(access_token=make_token(uid, email, "student"), user=user_public(doc))


@api.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not pwd_ctx.verify(data.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    return TokenOut(access_token=make_token(user["id"], email, user["role"]), user=user_public(user))


@api.get("/auth/me", response_model=UserOut)
async def me(user: Annotated[dict, Depends(current_user)]):
    return user_public(user)


@api.patch("/auth/me", response_model=UserOut)
async def update_me(data: ProfileUpdate, user: Annotated[dict, Depends(current_user)]):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]})
    return user_public(fresh)


# -----------------------------------------------------------------------------
# Book routes
# -----------------------------------------------------------------------------
@api.get("/books", response_model=List[BookOut])
async def list_books(
    q: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(50, le=200),
    _: Annotated[dict, Depends(current_user)] = None,
):
    filt = {}
    if category and category.lower() != "all":
        filt["category"] = category
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"author": {"$regex": q, "$options": "i"}},
            {"isbn": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.books.find(filt).to_list(limit)
    return [await book_public(strip_mongo(d)) for d in docs]


@api.get("/books/categories", response_model=List[str])
async def categories(_: Annotated[dict, Depends(current_user)] = None):
    cats = await db.books.distinct("category")
    return sorted(cats)


@api.get("/books/featured", response_model=List[BookOut])
async def featured(_: Annotated[dict, Depends(current_user)] = None):
    docs = await db.books.find().sort("rating", -1).to_list(8)
    return [await book_public(strip_mongo(d)) for d in docs]


@api.get("/books/{book_id}", response_model=BookOut)
async def get_book(book_id: str, _: Annotated[dict, Depends(current_user)] = None):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Book not found")
    return await book_public(strip_mongo(b))


# -----------------------------------------------------------------------------
# Loans
# -----------------------------------------------------------------------------
@api.post("/loans/borrow/{book_id}", response_model=LoanOut)
async def borrow(book_id: str, user: Annotated[dict, Depends(current_user)]):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Book not found")
    active = await db.loans.count_documents({"book_id": book_id, "status": "active"})
    if active >= b.get("total_copies", 1):
        raise HTTPException(409, "No copies available. Please reserve instead.")
    existing = await db.loans.find_one({"book_id": book_id, "user_id": user["id"], "status": "active"})
    if existing:
        raise HTTPException(409, "You already have this book borrowed")
    loan = {
        "id": str(uuid.uuid4()),
        "book_id": book_id,
        "user_id": user["id"],
        "borrowed_at": now(),
        "due_at": now() + timedelta(days=14),
        "returned_at": None,
        "status": "active",
    }
    await db.loans.insert_one(loan)
    # notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": "Book borrowed",
        "body": f"You borrowed '{b['title']}'. Due in 14 days.",
        "kind": "borrow",
        "read": False,
        "created_at": now(),
    })
    out = strip_mongo(loan)
    out["book"] = (await book_public(strip_mongo(b))).dict()
    return out


@api.post("/loans/return/{loan_id}", response_model=LoanOut)
async def return_loan(loan_id: str, user: Annotated[dict, Depends(current_user)]):
    loan = await db.loans.find_one({"id": loan_id})
    if not loan:
        raise HTTPException(404, "Loan not found")
    if loan["user_id"] != user["id"] and user["role"] != "librarian":
        raise HTTPException(403, "Not allowed")
    await db.loans.update_one(
        {"id": loan_id}, {"$set": {"status": "returned", "returned_at": now()}}
    )
    # promote reservation if any
    res = await db.reservations.find_one_and_update(
        {"book_id": loan["book_id"], "status": "waiting"},
        {"$set": {"status": "ready"}},
        sort=[("queue_position", 1)],
    )
    if res:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": res["user_id"],
            "title": "Reservation ready",
            "body": "Your reserved book is now available for pickup.",
            "kind": "reservation",
            "read": False,
            "created_at": now(),
        })
    fresh = await db.loans.find_one({"id": loan_id})
    b = await db.books.find_one({"id": loan["book_id"]})
    out = strip_mongo(fresh)
    out["book"] = (await book_public(strip_mongo(b))).dict() if b else None
    return out


@api.get("/loans/my", response_model=List[LoanOut])
async def my_loans(
    status_filter: Optional[str] = Query(None, alias="status"),
    user: Annotated[dict, Depends(current_user)] = None,
):
    filt = {"user_id": user["id"]}
    if status_filter:
        filt["status"] = status_filter
    docs = await db.loans.find(filt).sort("borrowed_at", -1).to_list(100)
    results = []
    for d in docs:
        d = strip_mongo(d)
        b = await db.books.find_one({"id": d["book_id"]})
        d["book"] = (await book_public(strip_mongo(b))).dict() if b else None
        results.append(d)
    return results


# -----------------------------------------------------------------------------
# Reservations
# -----------------------------------------------------------------------------
@api.post("/reservations/{book_id}", response_model=ReservationOut)
async def reserve(book_id: str, user: Annotated[dict, Depends(current_user)]):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Book not found")
    existing = await db.reservations.find_one(
        {"book_id": book_id, "user_id": user["id"], "status": {"$in": ["waiting", "ready"]}}
    )
    if existing:
        raise HTTPException(409, "You already have a reservation for this book")
    pos = await db.reservations.count_documents({"book_id": book_id, "status": "waiting"}) + 1
    doc = {
        "id": str(uuid.uuid4()),
        "book_id": book_id,
        "user_id": user["id"],
        "created_at": now(),
        "queue_position": pos,
        "status": "waiting",
    }
    await db.reservations.insert_one(doc)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": "Reservation placed",
        "body": f"You are #{pos} in queue for '{b['title']}'.",
        "kind": "reservation",
        "read": False,
        "created_at": now(),
    })
    out = strip_mongo(doc)
    out["book"] = (await book_public(strip_mongo(b))).dict()
    return out


@api.get("/reservations/my", response_model=List[ReservationOut])
async def my_reservations(user: Annotated[dict, Depends(current_user)]):
    docs = await db.reservations.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    results = []
    for d in docs:
        d = strip_mongo(d)
        b = await db.books.find_one({"id": d["book_id"]})
        d["book"] = (await book_public(strip_mongo(b))).dict() if b else None
        results.append(d)
    return results


@api.delete("/reservations/{res_id}")
async def cancel_reservation(res_id: str, user: Annotated[dict, Depends(current_user)]):
    r = await db.reservations.find_one({"id": res_id})
    if not r or r["user_id"] != user["id"]:
        raise HTTPException(404, "Reservation not found")
    await db.reservations.update_one({"id": res_id}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


# -----------------------------------------------------------------------------
# Notifications
# -----------------------------------------------------------------------------
@api.get("/notifications", response_model=List[NotificationOut])
async def notifications(user: Annotated[dict, Depends(current_user)]):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [strip_mongo(d) for d in docs]


@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: Annotated[dict, Depends(current_user)]):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


# -----------------------------------------------------------------------------
# Librarian endpoints
# -----------------------------------------------------------------------------
@api.get("/librarian/stats")
async def librarian_stats(user: Annotated[dict, Depends(require_role("librarian"))]):
    return {
        "total_books": await db.books.count_documents({}),
        "total_users": await db.users.count_documents({"role": "student"}),
        "active_loans": await db.loans.count_documents({"status": "active"}),
        "pending_reservations": await db.reservations.count_documents({"status": "waiting"}),
    }


@api.post("/librarian/books", response_model=BookOut)
async def create_book(data: BookIn, _: Annotated[dict, Depends(require_role("librarian"))]):
    doc = data.dict()
    doc["id"] = str(uuid.uuid4())
    doc["rating"] = 4.5
    doc["created_at"] = now()
    await db.books.insert_one(doc)
    return await book_public(strip_mongo(doc))


@api.patch("/librarian/books/{book_id}", response_model=BookOut)
async def update_book(
    book_id: str, data: BookIn, _: Annotated[dict, Depends(require_role("librarian"))]
):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Book not found")
    await db.books.update_one({"id": book_id}, {"$set": data.dict()})
    fresh = await db.books.find_one({"id": book_id})
    return await book_public(strip_mongo(fresh))


@api.delete("/librarian/books/{book_id}")
async def delete_book(book_id: str, _: Annotated[dict, Depends(require_role("librarian"))]):
    r = await db.books.delete_one({"id": book_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Book not found")
    return {"ok": True}


@api.get("/librarian/loans/active", response_model=List[LoanOut])
async def active_loans(_: Annotated[dict, Depends(require_role("librarian"))]):
    docs = await db.loans.find({"status": "active"}).sort("due_at", 1).to_list(200)
    results = []
    for d in docs:
        d = strip_mongo(d)
        b = await db.books.find_one({"id": d["book_id"]})
        d["book"] = (await book_public(strip_mongo(b))).dict() if b else None
        results.append(d)
    return results


@api.get("/librarian/reservations", response_model=List[ReservationOut])
async def all_reservations(_: Annotated[dict, Depends(require_role("librarian"))]):
    docs = await db.reservations.find({"status": {"$in": ["waiting", "ready"]}}).to_list(200)
    results = []
    for d in docs:
        d = strip_mongo(d)
        b = await db.books.find_one({"id": d["book_id"]})
        d["book"] = (await book_public(strip_mongo(b))).dict() if b else None
        results.append(d)
    return results


# -----------------------------------------------------------------------------
# Seed data
# -----------------------------------------------------------------------------
SEED_BOOKS = [
    ("Clean Code", "Robert C. Martin", "Software Engineering", "9780132350884",
     "A handbook of agile software craftsmanship.",
     "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400"),
    ("The Pragmatic Programmer", "Andrew Hunt", "Software Engineering", "9780135957059",
     "Your journey to mastery, 20th anniversary edition.",
     "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400"),
    ("Design Patterns", "Erich Gamma", "Software Engineering", "9780201633610",
     "Elements of reusable object-oriented software.",
     "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400"),
    ("Introduction to Algorithms", "Thomas H. Cormen", "Computer Science", "9780262033848",
     "The classic text in algorithms, used worldwide.",
     "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400"),
    ("Artificial Intelligence: A Modern Approach", "Stuart Russell", "Computer Science", "9780134610993",
     "The leading textbook in Artificial Intelligence.",
     "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400"),
    ("Deep Learning", "Ian Goodfellow", "Computer Science", "9780262035613",
     "A comprehensive introduction to deep learning.",
     "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"),
    ("Sapiens", "Yuval Noah Harari", "History", "9780062316097",
     "A brief history of humankind.",
     "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400"),
    ("Thinking, Fast and Slow", "Daniel Kahneman", "Psychology", "9780374533557",
     "A tour of the mind and the two systems that drive it.",
     "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"),
    ("The Lean Startup", "Eric Ries", "Business", "9780307887894",
     "How constant innovation creates radically successful businesses.",
     "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400"),
    ("Zero to One", "Peter Thiel", "Business", "9780804139298",
     "Notes on startups, or how to build the future.",
     "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400"),
    ("Educated", "Tara Westover", "Biography", "9780399590504",
     "A memoir about family, education, and self-invention.",
     "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400"),
    ("Atomic Habits", "James Clear", "Self-help", "9780735211292",
     "An easy & proven way to build good habits.",
     "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?w=400"),
    ("1984", "George Orwell", "Fiction", "9780451524935",
     "A dystopian social science fiction classic.",
     "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400"),
    ("To Kill a Mockingbird", "Harper Lee", "Fiction", "9780061120084",
     "A novel of warmth and humor despite its serious subjects.",
     "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400"),
    ("The Great Gatsby", "F. Scott Fitzgerald", "Fiction", "9780743273565",
     "The great American novel about Jay Gatsby.",
     "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=400"),
    ("A Brief History of Time", "Stephen Hawking", "Science", "9780553380163",
     "From the Big Bang to black holes.",
     "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400"),
    ("The Selfish Gene", "Richard Dawkins", "Science", "9780198788607",
     "The gene-centred view of evolution.",
     "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400"),
    ("Database System Concepts", "Abraham Silberschatz", "Computer Science", "9780078022159",
     "The classic database systems textbook.",
     "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400"),
    ("Operating System Concepts", "Abraham Silberschatz", "Computer Science", "9781118063330",
     "The definitive OS textbook used in universities.",
     "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400"),
    ("Computer Networking", "James F. Kurose", "Computer Science", "9780133594140",
     "A top-down approach to networking fundamentals.",
     "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400"),
]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.books.create_index("id", unique=True)
    await db.loans.create_index("id", unique=True)
    await db.reservations.create_index("id", unique=True)
    await db.notifications.create_index("id", unique=True)


async def seed():
    await ensure_indexes()
    # Seed test users (idempotent)
    seed_users = [
        ("student@smlms.edu", "Student123!", "Sophia Chen", "student", "S000001"),
        ("librarian@smlms.edu", "Librarian123!", "Mr. Thompson", "librarian", None),
    ]
    for email, pw, name, role, sid in seed_users:
        existing = await db.users.find_one({"email": email})
        if existing:
            continue
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "role": role,
            "student_id": sid,
            "password_hash": pwd_ctx.hash(pw),
            "created_at": now(),
        })
    # Seed books (idempotent by ISBN)
    for (title, author, cat, isbn, desc, cover) in SEED_BOOKS:
        if await db.books.find_one({"isbn": isbn}):
            continue
        await db.books.insert_one({
            "id": str(uuid.uuid4()),
            "title": title,
            "author": author,
            "category": cat,
            "isbn": isbn,
            "description": desc,
            "cover_url": cover,
            "location": f"Section {cat[0].upper()} • Shelf {hash(title) % 20 + 1}",
            "total_copies": 3,
            "rating": round(4.0 + (hash(title) % 10) / 10, 1),
            "created_at": now(),
        })
    logger.info("Seed complete")


@app.on_event("startup")
async def on_startup():
    await seed()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "SMLMS", "status": "ok", "version": "1.0.0"}


@api.get("/health")
async def health():
    return {"status": "healthy", "time": iso(now())}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
