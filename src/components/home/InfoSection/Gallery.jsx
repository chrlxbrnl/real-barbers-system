import { useState } from "react";
import g1 from "../../../assets/images/Gallery/g1.jpg";
import g2 from "../../../assets/images/Gallery/g2.jpg";
import g3 from "../../../assets/images/Gallery/g3.jpg";
import g4 from "../../../assets/images/Gallery/g4.jpg";
import g5 from "../../../assets/images/Gallery/g5.jpg";
import g6 from "../../../assets/images/Gallery/g6.jpg";

export default function Gallery() {
  const [activeImage, setActiveImage] = useState(null);

  const images = [
    { src: g1, alt: "Barber gallery image 1" },
    { src: g2, alt: "Barber gallery image 2" },
    { src: g3, alt: "Barber gallery image 3" },
    { src: g4, alt: "Barber gallery image 4" },
    { src: g5, alt: "Barber gallery image 5" },
    { src: g6, alt: "Barber gallery image 6" },
  ];

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold mb-4">Gallery</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveImage(image)}
            className="h-32 sm:h-40 rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="max-h-full max-w-full overflow-hidden rounded-md"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1 text-sm text-white cursor-pointer"
            >
              Close
            </button>
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
