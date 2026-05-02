import { useState, useRef } from "react";
import { Phone, Mail } from "lucide-react";
import Gallery from "./InfoSection/Gallery";
import Reviews from "./InfoSection/Reviews";
import FaceShapeSection from "./InfoSection/FaceShapeSection";
import RecommendationSection from "./InfoSection/RecommendationSection";

const InfoSection = ({ ref }) => {
  const [selectedShape, setSelectedShape] = useState("");
  const recommendationRef = useRef(null);

  const handleSelectShape = (shape) => {
    setSelectedShape(shape);

    setTimeout(() => {
      recommendationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  return (
    <section className="bg-white rounded-2xl shadow-md p-8 sm:p-10 md:p-14 space-y-10">
      <div className="space-y-8">
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2">About</h2>

          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Our barbershop online booking system is designed to make scheduling
            appointments faster and more convenient for customers. It allows
            users to book services anytime, browse different haircut styles, and
            use a face shape feature that recommends the best haircut based on
            their selected face type. The system also posts the latest haircut
            trends to help customers stay updated with modern styles and choose
            the best look before booking.
          </p>
        </div>

        <div id="contact">
          <h2 className="text-lg sm:text-xl font-normal mb-2">Contact Us</h2>

          <div className="text-sm sm:text-base text-gray-700 space-y-4">
            <p className="flex gap-2 items-center">
              <Phone /> 09931510440
            </p>
            <p className="flex gap-2 items-center">
              <Mail /> realbarbers0910@gmail.com
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-300 my-8"></div>

      <div id="gallery">
        <Gallery />
      </div>

      <div className="border-t border-gray-300 my-8"></div>

      <Reviews />

      <div className="border-t border-gray-300 my-8"></div>

      <div ref={ref}>
        <FaceShapeSection
          selectedShape={selectedShape}
          onSelectShape={handleSelectShape}
        />
      </div>

      <div ref={recommendationRef}>
        <RecommendationSection selectedShape={selectedShape} />
      </div>
    </section>
  );
};

export default InfoSection;
