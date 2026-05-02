import { useNavigate } from "react-router-dom";
import roundLogo from "../../assets/images/logo-2-round.png";

export default function ShopDetailsCard({ showBookButton = true }) {
  const navigate = useNavigate();

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

        <p className="mt-2 text-sm text-gray-700">4.9 ★★★★★ 25 reviews</p>

        {showBookButton && (
          <button
            onClick={() => navigate("/book")}
            className="mt-6 bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition cursor-pointer"
          >
            Book Now
          </button>
        )}

        <div className="mt-6 space-y-2">
          <p className="text-sm text-gray-800">Open. Closes at 9:30 PM</p>
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
