"""SMLMS backend API tests - all critical flows."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://libmobile-m2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

STUDENT = {"email": "student@smlms.edu", "password": "Student123!"}
LIBRARIAN = {"email": "librarian@smlms.edu", "password": "Librarian123!"}


@pytest.fixture(scope="session")
def student_token():
    r = requests.post(f"{API}/auth/login", json=STUDENT, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def librarian_token():
    r = requests.post(f"{API}/auth/login", json=LIBRARIAN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- Health ----------------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


# ---------------- Auth ----------------
def test_login_student_success():
    r = requests.post(f"{API}/auth/login", json=STUDENT, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["role"] == "student"
    assert data["user"]["email"] == STUDENT["email"]
    assert "access_token" in data


def test_login_bad_credentials():
    r = requests.post(f"{API}/auth/login", json={"email": "student@smlms.edu", "password": "wrong"}, timeout=10)
    assert r.status_code == 401


def test_me_with_token(student_token):
    r = requests.get(f"{API}/auth/me", headers=h(student_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == STUDENT["email"]


def test_me_without_token():
    r = requests.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_register_new_user_and_duplicate():
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@smlms.edu"
    payload = {"email": email, "password": "Password1!", "name": "TEST User"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=10)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user"]["role"] == "student"
    # duplicate
    r2 = requests.post(f"{API}/auth/register", json=payload, timeout=10)
    assert r2.status_code == 409


# ---------------- Books ----------------
def test_books_list_requires_auth():
    r = requests.get(f"{API}/books", timeout=10)
    assert r.status_code == 401


def test_books_list_and_count(student_token):
    r = requests.get(f"{API}/books", headers=h(student_token), timeout=10)
    assert r.status_code == 200
    books = r.json()
    assert len(books) >= 20
    assert "title" in books[0] and "available_copies" in books[0]


def test_books_search(student_token):
    r = requests.get(f"{API}/books", headers=h(student_token), params={"q": "Clean"}, timeout=10)
    assert r.status_code == 200
    titles = [b["title"] for b in r.json()]
    assert any("Clean" in t for t in titles)


def test_books_category_filter(student_token):
    r = requests.get(f"{API}/books", headers=h(student_token), params={"category": "Fiction"}, timeout=10)
    assert r.status_code == 200
    for b in r.json():
        assert b["category"] == "Fiction"


def test_books_categories(student_token):
    r = requests.get(f"{API}/books/categories", headers=h(student_token), timeout=10)
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list) and "Fiction" in cats


def test_books_featured(student_token):
    r = requests.get(f"{API}/books/featured", headers=h(student_token), timeout=10)
    assert r.status_code == 200
    assert len(r.json()) > 0


def test_book_detail(student_token):
    r = requests.get(f"{API}/books", headers=h(student_token), timeout=10)
    bid = r.json()[0]["id"]
    r2 = requests.get(f"{API}/books/{bid}", headers=h(student_token), timeout=10)
    assert r2.status_code == 200
    assert r2.json()["id"] == bid


def test_book_detail_404(student_token):
    r = requests.get(f"{API}/books/nonexistent", headers=h(student_token), timeout=10)
    assert r.status_code == 404


# ---------------- Loans ----------------
def test_borrow_and_duplicate_and_return(student_token):
    # pick a book not yet borrowed
    r = requests.get(f"{API}/books", headers=h(student_token), params={"q": "Zero to One"}, timeout=10)
    bid = r.json()[0]["id"]
    # cleanup: return any existing active loan for this book first
    my = requests.get(f"{API}/loans/my", headers=h(student_token), params={"status": "active"}, timeout=10).json()
    for ln in my:
        if ln["book_id"] == bid:
            requests.post(f"{API}/loans/return/{ln['id']}", headers=h(student_token), timeout=10)

    r = requests.post(f"{API}/loans/borrow/{bid}", headers=h(student_token), timeout=10)
    assert r.status_code == 200, r.text
    loan = r.json()
    assert loan["status"] == "active"
    assert loan["book"]["id"] == bid
    loan_id = loan["id"]

    # duplicate borrow -> 409
    r2 = requests.post(f"{API}/loans/borrow/{bid}", headers=h(student_token), timeout=10)
    assert r2.status_code == 409

    # GET verify
    mine = requests.get(f"{API}/loans/my", headers=h(student_token), timeout=10).json()
    assert any(l["id"] == loan_id for l in mine)

    # return
    rr = requests.post(f"{API}/loans/return/{loan_id}", headers=h(student_token), timeout=10)
    assert rr.status_code == 200
    assert rr.json()["status"] == "returned"


# ---------------- Reservations ----------------
def test_reservation_queue(student_token):
    r = requests.get(f"{API}/books", headers=h(student_token), params={"q": "Sapiens"}, timeout=10)
    bid = r.json()[0]["id"]
    # cleanup any existing
    for res in requests.get(f"{API}/reservations/my", headers=h(student_token), timeout=10).json():
        if res["book_id"] == bid and res["status"] in ("waiting", "ready"):
            requests.delete(f"{API}/reservations/{res['id']}", headers=h(student_token), timeout=10)

    r = requests.post(f"{API}/reservations/{bid}", headers=h(student_token), timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["queue_position"] >= 1
    res_id = data["id"]

    # duplicate
    r2 = requests.post(f"{API}/reservations/{bid}", headers=h(student_token), timeout=10)
    assert r2.status_code == 409

    # list
    lst = requests.get(f"{API}/reservations/my", headers=h(student_token), timeout=10).json()
    assert any(x["id"] == res_id for x in lst)

    # cancel
    d = requests.delete(f"{API}/reservations/{res_id}", headers=h(student_token), timeout=10)
    assert d.status_code == 200


# ---------------- Notifications ----------------
def test_notifications_list_and_mark_read(student_token):
    r = requests.get(f"{API}/notifications", headers=h(student_token), timeout=10)
    assert r.status_code == 200
    items = r.json()
    if items:
        nid = items[0]["id"]
        r2 = requests.post(f"{API}/notifications/{nid}/read", headers=h(student_token), timeout=10)
        assert r2.status_code == 200


# ---------------- Librarian / role-based ----------------
def test_student_forbidden_librarian_stats(student_token):
    r = requests.get(f"{API}/librarian/stats", headers=h(student_token), timeout=10)
    assert r.status_code == 403


def test_librarian_stats(librarian_token):
    r = requests.get(f"{API}/librarian/stats", headers=h(librarian_token), timeout=10)
    assert r.status_code == 200
    data = r.json()
    for k in ("total_books", "total_users", "active_loans", "pending_reservations"):
        assert k in data


def test_librarian_books_crud(librarian_token):
    payload = {
        "title": "TEST_Book",
        "author": "TEST_Author",
        "category": "TEST",
        "isbn": f"TEST_{uuid.uuid4().hex[:8]}",
        "description": "d",
        "cover_url": "",
        "location": "S",
        "total_copies": 2,
    }
    c = requests.post(f"{API}/librarian/books", headers=h(librarian_token), json=payload, timeout=10)
    assert c.status_code == 200, c.text
    bid = c.json()["id"]

    # update
    payload["title"] = "TEST_Book_Updated"
    u = requests.patch(f"{API}/librarian/books/{bid}", headers=h(librarian_token), json=payload, timeout=10)
    assert u.status_code == 200
    assert u.json()["title"] == "TEST_Book_Updated"

    # delete
    d = requests.delete(f"{API}/librarian/books/{bid}", headers=h(librarian_token), timeout=10)
    assert d.status_code == 200

    # verify gone
    g = requests.get(f"{API}/books/{bid}", headers=h(librarian_token), timeout=10)
    assert g.status_code == 404


def test_librarian_active_loans_and_reservations(librarian_token):
    r1 = requests.get(f"{API}/librarian/loans/active", headers=h(librarian_token), timeout=10)
    assert r1.status_code == 200
    r2 = requests.get(f"{API}/librarian/reservations", headers=h(librarian_token), timeout=10)
    assert r2.status_code == 200


# ---------------- Idempotent seed ----------------
def test_seed_idempotent_book_count(student_token):
    r1 = requests.get(f"{API}/books", headers=h(student_token), params={"limit": 200}, timeout=10)
    assert r1.status_code == 200
    # Just assert count is reasonable (20 seeded + any TEST books). After this test ends, no new seed should duplicate.
    assert len(r1.json()) >= 20
