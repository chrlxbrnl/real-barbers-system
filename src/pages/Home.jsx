import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import HeroSection from "../components/home/HeroSection";
import InfoSection from "../components/home/InfoSection";
import ShopDetailsCard from "../components/home/ShopDetailsCard";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import scrollToSection from "../utils/scrollToSection";

function HomeSkeleton() {
  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <nav className="bg-white border-b border-gray-200 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-36 rounded bg-gray-300"></div>
            <div className="hidden md:flex gap-6">
              <div className="h-5 w-12 rounded bg-gray-200"></div>
              <div className="h-5 w-28 rounded bg-gray-200"></div>
              <div className="h-5 w-16 rounded bg-gray-200"></div>
              <div className="h-5 w-16 rounded bg-gray-200"></div>
            </div>
            <div className="md:hidden h-7 w-7 rounded bg-gray-200"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 animate-pulse">
          <section className="lg:col-span-2 space-y-6">
            <div className="h-52 sm:h-64 md:h-72 lg:h-80 rounded-2xl bg-gray-200"></div>

            <div className="-mt-12 sm:-mt-16 md:-mt-20 px-3 sm:px-6 relative z-10">
              <div className="bg-white rounded-2xl shadow-md p-8 sm:p-10 md:p-14 space-y-10">
                <div className="space-y-4">
                  <div className="h-6 w-24 rounded bg-gray-300"></div>
                  <div className="space-y-3">
                    <div className="h-4 w-full rounded bg-gray-200"></div>
                    <div className="h-4 w-11/12 rounded bg-gray-200"></div>
                    <div className="h-4 w-4/5 rounded bg-gray-200"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-6 w-32 rounded bg-gray-300"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-32 sm:h-40 rounded bg-gray-200"
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-6 w-28 rounded bg-gray-300"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-xl bg-gray-200"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-8 self-start space-y-6">
            <div className="bg-white rounded-3xl shadow-md p-8 text-center">
              <div className="w-28 h-28 rounded-full bg-gray-200 mx-auto mb-5"></div>
              <div className="h-6 w-40 rounded bg-gray-300 mx-auto"></div>
              <div className="h-4 w-32 rounded bg-gray-200 mx-auto mt-3"></div>
              <div className="h-12 w-36 rounded-full bg-gray-300 mx-auto mt-6"></div>
              <div className="space-y-2 mt-6">
                <div className="h-4 w-40 rounded bg-gray-200 mx-auto"></div>
                <div className="h-3 w-32 rounded bg-gray-200 mx-auto"></div>
              </div>
            </div>

            <div className="h-12 w-full rounded-lg bg-gray-300"></div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const recommendationSectionRef = useRef(null);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!location.hash) return;

    const sectionId = location.hash.replace("#", "");

    requestAnimationFrame(() => {
      scrollToSection(sectionId);
    });
  }, [location.hash]);

  const handleScrollToRecommendation = () => {
    recommendationSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (user === undefined) {
    return <HomeSkeleton />;
  }

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Content */}
          <section className="lg:col-span-2 space-y-6">
            <HeroSection />

            {/* Overlapping Card */}
            <div className="-mt-12 sm:-mt-16 md:-mt-20 px-3 sm:px-6 relative z-10">
              <InfoSection ref={recommendationSectionRef} />
            </div>
          </section>

          {/* Right Content */}
          <aside className="lg:sticky lg:top-8 self-start">
            <ShopDetailsCard />

            <button
              onClick={() => handleScrollToRecommendation()}
              className="mt-6 w-full bg-black text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition cursor-pointer"
            >
              Hairstyle Recommendation
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
