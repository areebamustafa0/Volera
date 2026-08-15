"use client";

import React, { useEffect, useState } from "react";
import { Star, ShieldCheck, Loader2, MessageSquareOff } from "lucide-react";

interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  userName: string;
}

export function ReviewsSection({
  bookId,
  averageRating,
  reviewCount,
}: {
  bookId: number;
  averageRating: number;
  reviewCount: number;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const load = () => {
    fetch(`/api/reviews?bookId=${bookId}`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews ?? []);
        setCanReview(Boolean(d.canReview));
        setHasReviewed(Boolean(d.hasReviewed));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => setSignedIn(r.ok))
      .catch(() => setSignedIn(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <section className="mt-10" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-bold text-[#0f172a] mb-6">Ratings &amp; Reviews</h2>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-6">
        <div className="grid sm:grid-cols-[auto_1fr] gap-8">
          <div className="text-center sm:border-r sm:border-[#e2e8f0] sm:pr-8 flex flex-col justify-center">
            <p className="text-4xl font-bold text-[#0f172a]">{averageRating.toFixed(1)}</p>
            <div className="flex items-center justify-center gap-0.5 my-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "text-[#e2e8f0]"}`} />
              ))}
            </div>
            <p className="text-xs text-[#94a3b8]">{reviewCount.toLocaleString()} review{reviewCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="space-y-1.5">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-[#475569] font-medium">{d.star}★</span>
                <div className="flex-1 h-2 bg-[#f1f4f9] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-[#94a3b8]">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-[#f1f4f9] rounded-xl skeleton" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center mb-6">
          <MessageSquareOff className="w-8 h-8 text-[#cbd5e1] mx-auto mb-2" />
          <p className="text-sm text-[#475569]">No reviews yet. Be the first to share your thoughts.</p>
        </div>
      ) : (
        <ul className="space-y-4 mb-6">
          {reviews.map((r) => (
            <li key={r.id} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-[#e2e8f0]"}`} />
                  ))}
                </div>
                <time className="text-xs text-[#94a3b8]" dateTime={r.createdAt}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </time>
              </div>
              <p className="font-semibold text-[#0f172a] text-sm mb-1">{r.title}</p>
              <p className="text-sm text-[#475569] leading-relaxed mb-2">{r.comment}</p>
              <p className="flex items-center gap-1.5 text-xs text-[#059669] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Purchase · {r.userName}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canReview && <ReviewForm bookId={bookId} onSubmitted={load} />}
      {!canReview && hasReviewed && (
        <p className="text-sm text-[#475569] bg-[#f1f4f9] rounded-xl p-4">
          You&apos;ve already reviewed this book. Thank you for your feedback!
        </p>
      )}
      {!canReview && !hasReviewed && signedIn === false && (
        <p className="text-sm text-[#475569] bg-[#f1f4f9] rounded-xl p-4">
          <a href="/auth/login" className="text-[#2d5a9e] font-semibold hover:underline">Sign in</a> and purchase this book to write a review.
        </p>
      )}
      {!canReview && !hasReviewed && signedIn === true && (
        <p className="text-sm text-[#475569] bg-[#f1f4f9] rounded-xl p-4">
          Only customers who purchased this book can write a review.
        </p>
      )}
    </section>
  );
}

function ReviewForm({ bookId, onSubmitted }: { bookId: number; onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, rating, title, comment }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setDone(true);
      onSubmitted();
    } else {
      setError(data.error ?? "Could not submit review");
    }
  };

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-800">
        Thank you! Your review has been submitted and is pending moderation.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
      <h3 className="font-bold text-[#0f172a]">Write a Review</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-2">Your Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
              <Star className={`w-6 h-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-[#e2e8f0]"}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="review-title" className="block text-xs font-semibold text-[#475569] mb-1.5">Review Title</label>
        <input
          id="review-title" required minLength={2} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/20 focus:border-[#2d5a9e]"
          placeholder="Sum up your experience"
        />
      </div>
      <div>
        <label htmlFor="review-comment" className="block text-xs font-semibold text-[#475569] mb-1.5">Your Review</label>
        <textarea
          id="review-comment" required minLength={10} maxLength={2000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/20 focus:border-[#2d5a9e]"
          placeholder="What did you like or dislike?"
        />
      </div>
      <button type="submit" disabled={loading} className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#132644] transition-colors disabled:opacity-60 flex items-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} Submit Review
      </button>
    </form>
  );
}
