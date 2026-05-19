import { Star } from "lucide-react";

function StarRating({ rating }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < rating ? "fill-black text-black" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

export default function ReviewSummary({ averageRating = 4.9, reviewCount = 25, ratings = {}, onWriteReview }) {
  const totalRatings = [5, 4, 3, 2, 1].reduce(
    (sum, star) => sum + (ratings[star] || 0),
    0,
  );

  const bars = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratings[stars] || 0,
    percent:
      totalRatings > 0 ? Math.round(((ratings[stars] || 0) / totalRatings) * 100) : 0,
  }));

  const displayReviewCount = totalRatings || reviewCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      {/* LEFT */}
      <div className="space-y-4">
        {bars.map((bar, index) => (
          <div key={index} className="flex items-center gap-4">
            <StarRating rating={bar.stars} />

            <div className="flex-1 h-0.5 bg-gray-300 relative">
              <div
                className="absolute left-0 top-0 h-0.5 bg-black"
                style={{ width: `${bar.percent}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT */}
      <div className="border border-gray-300 px-6 py-8 text-center">
        <div className="text-xl font-semibold">{averageRating.toFixed(1)}</div>

        <div className="flex justify-center mt-2">
          <StarRating rating={Math.round(averageRating)} />
        </div>

        <p className="mt-2 text-sm text-gray-700">{displayReviewCount} review{displayReviewCount === 1 ? "" : "s"}</p>

        <button
          type="button"
          onClick={onWriteReview}
          className="mt-5 border border-gray-400 px-5 py-2 rounded-full text-sm hover:bg-black hover:text-white transition cursor-pointer"
        >
          Write a review
        </button>
      </div>
    </div>
  );
}
