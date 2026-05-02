import { useEffect, useState } from "react";
import { buildRecommendations, mergeHaircutStyles } from "../../../data/haircuts";
import { subscribeHaircutStyleOverrides } from "../../../services/haircuts";

export default function RecommendationSection({ selectedShape }) {
  const [flippedCards, setFlippedCards] = useState({});
  const [recommendations, setRecommendations] = useState(() =>
    buildRecommendations(mergeHaircutStyles()),
  );

  useEffect(() => {
    const unsubscribe = subscribeHaircutStyleOverrides(
      (styles) => {
        setRecommendations(buildRecommendations(mergeHaircutStyles(styles)));
      },
      (error) => {
        console.error("Error loading haircut recommendations:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  if (!selectedShape) return null;

  const data = recommendations[selectedShape];

  if (!data) return null;

  const handleFlip = (cardName) => {
    const isMobile = window.innerWidth < 768;

    if (!isMobile) return;

    setFlippedCards((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4">
          Recommended Hairstyles for {selectedShape} Face Shape
        </h2>

        <div className="bg-[#f9f9f9] rounded-2xl p-5 sm:p-6">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {data.description}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {data.hairstyles.length === 0 ? (
          <p className="text-sm text-gray-500">
            No haircut recommendations are available for this face shape yet.
          </p>
        ) : (
          data.hairstyles.map((style) => {
            const isClicked = flippedCards[style.id];

            return (
              <button
                key={style.id}
                type="button"
                onClick={() => handleFlip(style.id)}
                className="group h-80 w-full cursor-pointer bg-transparent text-left [perspective:1000px]"
              >
                <div
                  className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] md:group-hover:rotate-y-180 ${
                    isClicked ? "rotate-y-180" : ""
                  }`}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-lg [backface-visibility:hidden]">
                    <div className="h-60 w-full bg-gray-50">
                      {style.image ? (
                        <img
                          src={style.image}
                          alt={style.name}
                          className="block h-full w-full object-contain object-center"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-400">
                          No image added
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-sm sm:text-base font-medium text-gray-800">
                        {style.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Hover on desktop / tap on mobile
                      </p>
                    </div>
                  </div>

                  <div className="absolute inset-0 rounded-lg text-black p-5 flex flex-col justify-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    <h3 className="text-base sm:text-lg font-semibold mb-3">
                      {style.name}
                    </h3>

                    <p className="text-sm sm:text-base leading-relaxed text-black">
                      {style.details}
                    </p>

                    <p className="text-xs text-gray-400 mt-4">
                      Tap again on mobile to go back
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
