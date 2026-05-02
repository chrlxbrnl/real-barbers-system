import heroImage from "../../assets/images/appointment/rb_hero.png";

export default function HeroSection() {
  return (
    <section className="overflow-hidden rounded-2xl shadow-sm">
      <div className="w-full h-52 sm:h-64 md:h-72 lg:h-80">
        <img
          src={heroImage}
          alt="Real Barbers"
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
}
