import logo from "../assets/images/logo.png";

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img className="w-10 md:w-12 h-auto" src={logo} alt="Real Barbers Logo" />
      <h1 className="font-extrabold uppercase text-xl md:text-2xl tracking-wide">
        Real Barbers
      </h1>
    </div>
  );
}
