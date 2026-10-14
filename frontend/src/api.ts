// SMLMS API client. All backend routes are /api prefixed.
import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "smlms_token";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "student" | "librarian";
  student_id?: string | null;
  created_at: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn?: string | null;
  description: string;
  cover_url: string;
  location: string;
  total_copies: number;
  available_copies: number;
  rating: number;
};

export type Loan = {
  id: string;
  book_id: string;
  book?: Book | null;
  user_id: string;
  borrowed_at: string;
  due_at: string;
  returned_at?: string | null;
  status: "active" | "returned" | "overdue";
};

export type Reservation = {
  id: string;
  book_id: string;
  book?: Book | null;
  user_id: string;
  created_at: string;
  queue_position: number;
  status: "waiting" | "ready" | "fulfilled" | "cancelled";
};

export type Notif = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  created_at: string;
};

async function getToken(): Promise<string | null> {
  return (await storage.secureGet<string>(TOKEN_KEY, "")) || null;
}

export async function setToken(token: string | null) {
  if (token) await storage.secureSet(TOKEN_KEY, token);
  else await storage.secureRemove(TOKEN_KEY);
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg = (body && (body.detail || body.message)) || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return body as T;
}

export const api = {
  // auth
  register: (email: string, password: string, name: string) =>
    request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/auth/me"),
  updateProfile: (data: { name?: string; student_id?: string }) =>
    request<User>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),

  // books
  listBooks: (opts: { q?: string; category?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.q) params.set("q", opts.q);
    if (opts.category) params.set("category", opts.category);
    const qs = params.toString();
    return request<Book[]>(`/books${qs ? "?" + qs : ""}`);
  },
  categories: () => request<string[]>("/books/categories"),
  featured: () => request<Book[]>("/books/featured"),
  getBook: (id: string) => request<Book>(`/books/${id}`),

  // loans
  borrow: (bookId: string) => request<Loan>(`/loans/borrow/${bookId}`, { method: "POST" }),
  returnLoan: (loanId: string) => request<Loan>(`/loans/return/${loanId}`, { method: "POST" }),
  myLoans: (status?: string) =>
    request<Loan[]>(`/loans/my${status ? `?status=${status}` : ""}`),

  // reservations
  reserve: (bookId: string) =>
    request<Reservation>(`/reservations/${bookId}`, { method: "POST" }),
  myReservations: () => request<Reservation[]>("/reservations/my"),
  cancelReservation: (id: string) =>
    request(`/reservations/${id}`, { method: "DELETE" }),

  // notifications
  notifications: () => request<Notif[]>("/notifications"),
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: "POST" }),

  // librarian
  librarianStats: () =>
    request<{
      total_books: number;
      total_users: number;
      active_loans: number;
      pending_reservations: number;
    }>("/librarian/stats"),
  createBook: (data: any) =>
    request<Book>("/librarian/books", { method: "POST", body: JSON.stringify(data) }),
  updateBook: (id: string, data: any) =>
    request<Book>(`/librarian/books/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBook: (id: string) => request(`/librarian/books/${id}`, { method: "DELETE" }),
  activeLoans: () => request<Loan[]>("/librarian/loans/active"),
  allReservations: () => request<Reservation[]>("/librarian/reservations"),
};
