import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { subscribeReviews, createReview } from "../../../services/reviews";
import ReviewSummary from "./ReviewSummary";

const sampleReviews = [
  {
    id: 1,
    name: "Rachelle Anne",
    rating: 5,
    comment:
      "Stylish, professional, and consistent. They know exactly how to bring out your best look.",
  },
  {
    id: 2,
    name: "Alyssa Arcadio",
    rating: 5,
    comment: "Always a clean cut and friendly service.",
  },
  {
    id: 3,
    name: "Jomel Puno",
    rating: 4,
    comment: "No long waits.",
  },
];

function StarRating({ rating }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;

        return (
          <Star
            key={i}
            size={16}
            className={
              rating >= starValue ? "fill-black text-black" : "text-gray-500"
            }
          />
        );
      })}
    </div>
  );
}

export default function Reviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeReviews(
      (reviewList) => {
        setReviews(reviewList);
      },
      (error) => {
        console.error("Failed to load reviews:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  const displayedReviews = reviews.length ? reviews : sampleReviews;
  const reviewCount = displayedReviews.length;
  const averageRating = reviewCount
    ? displayedReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewCount
    : 4.9;
  const ratingCounts = displayedReviews.reduce((counts, review) => {
    const rating = Math.max(1, Math.min(5, review.rating || 0));
    counts[rating] = (counts[rating] || 0) + 1;
    return counts;
  }, {});

  const handleWriteReview = () => {
    if (!user) {
      navigate("/account");
      return;
    }

    setShowReviewForm(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate("/account");
      return;
    }

    if (!reviewForm.comment.trim()) {
      setErrorMessage("Please write a few words about your visit.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      await createReview(user, reviewForm);
      setReviewForm({ rating: 5, comment: "" });
      setShowReviewForm(false);
    } catch (error) {
      console.error("Failed to save review:", error);
      setErrorMessage("Unable to submit your review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Reviews</h2>

      <ReviewSummary
        averageRating={averageRating}
        reviewCount={reviewCount}
        ratings={ratingCounts}
        onWriteReview={handleWriteReview}
      />

      {showReviewForm && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Share your experience
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Your review helps others choose the right cut.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="text-sm text-gray-500 hover:text-black"
            >
              Cancel
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setReviewForm((form) => ({ ...form, rating }))}
                className={
                  rating <= reviewForm.rating
                    ? "p-2 text-black"
                    : "p-2 text-gray-300 hover:text-black"
                }
                aria-label={`${rating} star rating`}
              >
                <Star className="h-5 w-5" />
              </button>
            ))}
          </div>

          <textarea
            value={reviewForm.comment}
            onChange={(event) =>
              setReviewForm((form) => ({ ...form, comment: event.target.value }))
            }
            rows={5}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-black focus:outline-none"
            placeholder="Tell us about your visit"
          />

          {errorMessage && (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Submit review"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {displayedReviews.map((review) => (
          <div
            key={review.id}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {review.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(review.createdAt?.toDate?.() || review.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
              <StarRating rating={review.rating} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {review.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
