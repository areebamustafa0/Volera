"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Plus, RefreshCw, Trash2, FileText, BookOpen, Loader2, Check } from "lucide-react";

interface AdminBook {
  id: number;
  title: string;
  isbn: string;
  authorName: string;
  categoryName: string;
  formats: { id: number; format: string; price: string; stock: number }[];
}

export default function AdminPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [tab, setTab] = useState<"books" | "add" | "pdf">("books");
  const [msg, setMsg] = useState("");

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3500);
  };

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/books");
    if (!res.ok) {
      setAllowed(false);
      return;
    }
    const data = await res.json();
    setAllowed(true);
    setBooks(data.books ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setUser(d?.user ?? null);
        if (d?.user?.role === "ADMIN") load();
        else setAllowed(false);
      })
      .catch(() => setAllowed(false));
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-gray-600 text-sm mt-1">Manage your book catalog and PDF content</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:border-blue-900"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {allowed === false && (
          <div className="bg-white border border-red-200 rounded-xl p-10 text-center">
            <h2 className="text-xl font-bold mb-2 text-red-700">Admin access required</h2>
            <p className="text-sm text-gray-600 mb-5">
              Sign in with an administrator account to manage the catalog.
            </p>
            <Link
              href="/auth/login?redirect=/admin"
              className="inline-block bg-blue-900 text-white px-6 py-2.5 rounded-lg font-semibold text-sm"
            >
              Sign in as admin
            </Link>
          </div>
        )}

        {allowed && (
          <>
            {msg && (
              <div className="mb-5 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" /> {msg}
              </div>
            )}

            <div className="flex gap-2 mb-6 border-b border-gray-200">
              {([
                ["books", "All Books", BookOpen],
                ["add", "Add Book", Plus],
                ["pdf", "Upload PDF Content", FileText],
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                    tab === id
                      ? "border-blue-900 text-blue-900"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {tab === "books" && <BooksTable books={books} load={load} flash={flash} />}
            {tab === "add" && <AddBookForm load={load} flash={flash} setTab={setTab} />}
            {tab === "pdf" && <ChapterUploader books={books} flash={flash} />}
          </>
        )}
      </main>
    </div>
  );
}

function BooksTable({
  books,
  load,
  flash,
}: {
  books: AdminBook[];
  load: () => void;
  flash: (m: string) => void;
}) {
  const remove = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This also removes its formats and PDF content.`)) return;
    const res = await fetch(`/api/admin/books?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Book deleted");
      load();
    }
  };

  const setStock = async (formatId: number, stock: number) => {
    const res = await fetch("/api/admin/books", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: { formatId, stock } }),
    });
    if (res.ok) flash("Stock updated");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="text-left px-6 py-3">Book</th>
            <th className="text-left px-6 py-3">Category</th>
            <th className="text-left px-6 py-3">Formats &amp; Price</th>
            <th className="text-left px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {books.map((b) => (
            <tr key={b.id}>
              <td className="px-6 py-4">
                <p className="font-semibold">{b.title}</p>
                <p className="text-xs text-gray-500">
                  {b.authorName} · {b.isbn}
                </p>
              </td>
              <td className="px-6 py-4 text-gray-600">{b.categoryName}</td>
              <td className="px-6 py-4">
                {b.formats.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 mb-1 text-xs">
                    <span
                      className={`w-20 font-semibold ${
                        f.format === "EBOOK" ? "text-green-700" : "text-gray-700"
                      }`}
                    >
                      {f.format === "EBOOK" ? "PDF" : f.format}
                    </span>
                    <span className="w-14">${Number(f.price).toFixed(2)}</span>
                    {f.format !== "EBOOK" && (
                      <input
                        type="number"
                        defaultValue={f.stock}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== f.stock && !Number.isNaN(v)) setStock(f.id, v);
                        }}
                        className="w-16 border border-gray-300 rounded px-2 py-0.5"
                        title="Stock"
                      />
                    )}
                  </div>
                ))}
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => remove(b.id, b.title)}
                  className="inline-flex items-center gap-1.5 text-xs text-red-600 border border-red-300 px-3 py-1.5 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </td>
            </tr>
          ))}
          {books.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                No books yet. Use &ldquo;Add Book&rdquo; to create one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddBookForm({
  load,
  flash,
  setTab,
}: {
  load: () => void;
  flash: (m: string) => void;
  setTab: (t: "books") => void;
}) {
  const [form, setForm] = useState({
    title: "",
    authorId: "1",
    categoryId: "1",
    isbn: "",
    publisher: "Self Published",
    description: "",
    coverImage:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
    publicationDate: "2026",
    pages: "300",
    ebookPrice: "9.99",
    paperbackPrice: "19.99",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        authorId: Number(form.authorId),
        categoryId: Number(form.categoryId),
        pages: Number(form.pages),
        ebookPrice: Number(form.ebookPrice) || undefined,
        paperbackPrice: Number(form.paperbackPrice) || undefined,
        isNewArrival: true,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      flash(`"${form.title}" added. Now upload its PDF content.`);
      setForm({ ...form, title: "", isbn: "", description: "" });
      load();
      setTab("books");
    } else {
      setError(data.error || "Could not create book");
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 grid md:grid-cols-2 gap-4">
      <h2 className="md:col-span-2 text-lg font-bold">Add a new book</h2>

      {error && (
        <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {field("Title *", "title")}
      {field("ISBN *", "isbn")}
      {field("Author ID", "authorId", "number")}
      {field("Category ID", "categoryId", "number")}
      {field("Publisher", "publisher")}
      {field("Publication Year", "publicationDate")}
      {field("Pages", "pages", "number")}
      {field("Cover Image URL", "coverImage")}
      {field("PDF / eBook Price ($)", "ebookPrice", "number")}
      {field("Paperback Price ($)", "paperbackPrice", "number")}

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="md:col-span-2 bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Create Book
      </button>
    </form>
  );
}

function ChapterUploader({ books, flash }: { books: AdminBook[]; flash: (m: string) => void }) {
  const [bookId, setBookId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("1");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: Number(bookId),
        chapterNumber: Number(chapterNumber),
        title,
        content,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      flash(`Chapter ${chapterNumber} saved. It is now readable and downloadable as PDF.`);
      setChapterNumber(String(Number(chapterNumber) + 1));
      setTitle("");
      setContent("");
    } else {
      setError(data.error || "Could not save chapter");
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Upload PDF / readable content</h2>
        <p className="text-sm text-gray-600 mt-1">
          Add the book text chapter by chapter. This powers both the online reader and the
          generated PDF download.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Book *</label>
          <select
            required
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a book…</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chapter number *</label>
          <input
            type="number"
            min={1}
            required
            value={chapterNumber}
            onChange={(e) => setChapterNumber(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Chapter title *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter One — The Beginning"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chapter text * <span className="font-normal text-gray-500">(blank line between paragraphs)</span>
        </label>
        <textarea
          required
          minLength={20}
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"Paste the chapter text here.\n\nSeparate paragraphs with a blank line."}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {content.split(/\s+/).filter(Boolean).length} words
        </p>
      </div>

      <button
        type="submit"
        disabled={saving || !bookId}
        className="bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Chapter
      </button>
    </form>
  );
}
