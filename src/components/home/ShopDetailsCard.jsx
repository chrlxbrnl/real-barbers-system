import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import roundLogo from "../../assets/images/logo-2-round.png";
import { subscribeReviews } from "../../services/reviews";

function RatingStars({ rating }) {
  const roundedRating = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(roundedRating);
  const hasHalfStar = roundedRating - fullStars === 0.5;

  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const isFull = index < fullStars;
        const isHalf = index === fullStars && hasHalfStar;

        return (
          <div key={index} className="relative inline-block w-4 h-4">
            <Star size={16} className="text-gray-300" />
            {(isFull || isHalf) && (
              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: isHalf ? "50%" : "100%" }}
              >
                <Star size={16} className="fill-black text-black" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ShopDetailsCard({ showBookButton = true }) {
  const navigate = useNavigate();
  const [reviewCount, setReviewCount] = useState(25);
  const [averageRating, setAverageRating] = useState(4.9);

  useEffect(() => {
    const unsubscribe = subscribeReviews(
      (reviewList) => {
        const count = reviewList.length;
        const average = count
          ?
            reviewList.reduce((sum, review) => sum + (review.rating || 0), 0) /
            count
          : 4.9;

        setReviewCount(count);
        setAverageRating(Number(average.toFixed(1)));
      },
      (error) => {
        console.error("Failed to load reviews:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-md overflow-hidden">
      <div className="p-8 text-center">
        <img
          src={roundLogo}
          alt="Real Barbers Logo"
          className="w-28 h-28 rounded-full object-cover mx-auto mb-5"
        />

        <h2 className="text-xl font-bold uppercase tracking-wide">
          Real Barbers
        </h2>

        <div className="mt-2 text-sm text-gray-700">
          <div className="flex items-center justify-center gap-2">
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <RatingStars rating={averageRating} />
          </div>
          <div>{reviewCount} reviews</div>
        </div>

        {showBookButton && (
          <button
            onClick={() => navigate("/book")}
            className="mt-6 bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition cursor-pointer"
          >
            Book Now
          </button>
        )}

        <div className="mt-6 space-y-2">
          <p className="text-sm text-gray-800">Opens at 8:00 AM. Closes at 9:30 PM</p>
          <p className="text-xs text-gray-500">
            All Haircut Styles – ₱150 Only
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 px-6 py-5 text-center">
        <p className="text-sm text-gray-700 leading-relaxed">
          Maryhomes Molino 4, Bacoor Cavite near Metro South Barbershop
        </p>
      </div>
    </div>
  );
}
