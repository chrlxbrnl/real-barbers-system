import hero1 from "../assets/images/hero-1.png";
import logo from "../assets/images/logo.png";
import faceShapes from "../assets/images/Face Shapes/Face_Shapes.png";

export default function Home() {
  return (
    <>
      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-20 px-6 md:px-12 py-5 flex items-center justify-center md:justify-start text-white">
        <div className="flex items-center gap-3">
          <img
            className="w-10 md:w-12 h-auto"
            src={logo}
            alt="Real Barbers Logo"
          />
          <h1 className="font-extrabold uppercase text-xl md:text-2xl tracking-wide">
            Real Barbers
          </h1>
        </div>

        {/* <a
          href="#"
          className="hidden md:inline-block bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition duration-300"
        >
          Book Appointment
        </a> */}
      </header>

      <main>
        <section
          className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
          style={{
            backgroundImage: `url(${hero1})`,
            backgroundPosition: "center",
          }}
        >
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b  from-black/70 via-black/60 to-black/80"></div>

          {/* Hero Content */}
          <div className="relative z-10 text-white text-center px-6 max-w-2xl">
            <p className="text-lg md:text-xl mb-6 text-gray-300">
              Book appointments with skilled, professional barbers online.
            </p>

            <h2 className="uppercase font-bold text-3xl md:text-5xl leading-tight mb-8">
              Where real skill <br className="hidden sm:block" />
              meets real style
            </h2>

            {/* CTA Button (Mobile + Desktop) */}
            <a
              href="#"
              className="inline-block bg-white text-black px-8 py-3 rounded-full font-semibold text-lg hover:scale-105 hover:bg-gray-200 transition duration-300"
            >
              Book Appointment
            </a>
          </div>
        </section>

        <section className="min-h-screen px-6 py-16 md:px-16 flex flex-col md:flex-row items-center">
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-6">
              Choose Your Face Shape, <br className="hidden sm:block" />
              Get Your Best Style
            </h2>

            <p className="max-w-md mx-auto md:mx-0 text-lg text-gray-600">
              Our system helps you find the most suitable haircut based on your
              face shape. Just pick your face type and discover hairstyles that
              will make you look sharper and more confident.
            </p>
          </div>

          {/* Image */}
          <div className="flex-1 flex justify-center shrink-0">
            <img
              src={faceShapes}
              alt="Face Shapes"
              className="w-64 h-auto object-contain sm:w-80"
            />
          </div>
        </section>
      </main>
    </>
  );
}
