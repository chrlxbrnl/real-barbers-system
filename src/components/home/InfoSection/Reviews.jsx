import { Star } from "lucide-react";
import ReviewSummary from "./ReviewSummary";

const reviews = [
  {
    id: 1,
    name: "Rachelle Anne",
    rating: 5,
    text: "Stylish, professional, and consistent. They know exactly how to bring out your best look.",
  },
  {
    id: 2,
    name: "Alyssa Arcadio",
    rating: 5,
    text: "Always a clean cut and friendly service.",
  },
  {
    id: 3,
    name: "Jomel Puno",
    rating: 4,
    text: "No long waits.",
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
  return (
    <div className="space-y-10">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Reviews</h2>

      <ReviewSummary />

      <div className="space-y-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="pb-6 border-b border-gray-200 last:border-b-0 last:pb-0"
          >
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">
              {review.name}
            </h3>

            <div className="mt-2">
              <StarRating rating={review.rating} />
            </div>

            <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
              {review.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
