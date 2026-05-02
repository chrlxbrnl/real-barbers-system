import { useState } from "react";
import ovalImg from "../../../assets/images/Face Shapes/Oval.png";
import roundImg from "../../../assets/images/Face Shapes/Round.png";
import squareImg from "../../../assets/images/Face Shapes/Square.png";
import oblongImg from "../../../assets/images/Face Shapes/Oblong.png";
import heartImg from "../../../assets/images/Face Shapes/Heart.png";
import diamondImg from "../../../assets/images/Face Shapes/Diamond.png";

const faceShapes = [
  { name: "Oval", image: ovalImg },
  { name: "Round", image: roundImg },
  { name: "Square", image: squareImg },
  { name: "Oblong", image: oblongImg },
  { name: "Heart", image: heartImg },
  { name: "Diamond", image: diamondImg },
];

export default function FaceShapeSection({ selectedShape, onSelectShape }) {
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold mb-2">
        Hairstlye Recommendation
      </h2>

      <p className="text-sm sm:text-base leading-relaxed text-gray-600 mb-6">
        Pick your face shape and we’ll suggest the best haircut style that
        matches your features. Find the perfect look and book your favorite
        style instantly!
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {faceShapes.map((shape) => {
          const isActive = selectedShape === shape.name;

          return (
            <button
              key={shape.name}
              onClick={() => onSelectShape(shape.name)}
              className={`rounded-2xl border p-4 transition cursor-pointer ${isActive
                  ? "border-black"
                  : "border-gray-300 hover:bg-gray-50 text-gray-800"}`}
            >
              <div className="w-14 h-14 flex items-center justify-center sm:w-16 sm:h-16 mx-auto">
                <img
                  src={shape.image}
                  alt={shape.name}
                  className={`w-full h-full object-contain`}
                />
              </div>

              <p className="text-sm sm:text-base font-medium">{shape.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
