import { useEffect, useRef, useState } from "react";
import { Menu, LogOut } from "lucide-react";
import Logo from "./Logo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import scrollToSection from "../utils/scrollToSection";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../utils/isAdmin";

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 0) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsNavVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const hideNavOnGalleryOpen = () => setIsNavVisible(false);
    const showNavOnGalleryClose = () => setIsNavVisible(true);

    window.addEventListener("gallery-modal-open", hideNavOnGalleryOpen);
    window.addEventListener("gallery-modal-close", showNavOnGalleryClose);

    return () => {
      window.removeEventListener("gallery-modal-open", hideNavOnGalleryOpen);
      window.removeEventListener("gallery-modal-close", showNavOnGalleryClose);
    };
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
      if (window.innerWidth < 768) {
        setIsUserMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSectionNavigation = (sectionId) => {
    setIsOpen(false);

    if (location.pathname === "/home") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToSection(sectionId);
        });
      });
      return;
    }

    navigate(`/home#${sectionId}`);
  };

  const getFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(" ")[0];
    }
    return user?.email?.split("@")[0] || "User";
  };

  return (
    <header className={`sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm transform transition-transform duration-300 ${isNavVisible ? "translate-y-0" : "-translate-y-full"}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <Link
            to={isAdmin(user) ? "/admin" : "/"}
            className="flex items-center"
            onClick={() => setIsOpen(false)}
          >
            <Logo />
          </Link>

          {isAdmin(user) ? (
            // Admin Navigation
            <div className="flex items-center gap-6">
              <ul className="hidden min-[1180px]:flex gap-6 text-sm font-medium text-gray-800">
                <li>
                  <Link to="/admin">Dashboard</Link>
                </li>
                <li>
                  <Link to="/admin/appointments">Appointment Management</Link>
                </li>
                <li>
                  <Link to="/admin/haircuts">Haircut Management</Link>
                </li>
                <li>
                  <Link to="/admin/users">User Management</Link>
                </li>
              </ul>

              {/* User Account Dropdown */}
              {user && (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="hidden min-[1180px]:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                      {getFirstName()?.[0]?.toUpperCase()}
                    </div>
                    <span className="truncate max-w-xs">{getFirstName()}</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{user.displayName || user.email}</p>
                      </div>
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        Account
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          navigate("/");
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Regular User Navigation
            <div className="flex items-center gap-4">
              <ul className="hidden md:flex gap-6 text-sm font-medium text-gray-800">
                <li>
                  <Link to="/home">Home</Link>
                </li>
                <li>
                  <Link to="/appointment">View appointment</Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation("gallery")}
                    className="cursor-pointer"
                  >
                    Gallery
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation("contact")}
                    className="cursor-pointer"
                  >
                    Contact
                  </button>
                </li>
                {!user && (
                  <li>
                    <Link to="/account">Account</Link>
                  </li>
                )}
              </ul>

              {/* User Account Dropdown */}
              {user && (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                      {getFirstName()?.[0]?.toUpperCase()}
                    </div>
                    <span className="truncate max-w-xs">{getFirstName()}</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{user.displayName || user.email}</p>
                      </div>
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        Account
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          navigate("/");
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            className={`${isAdmin(user) ? "hidden max-[1179px]:block" : "md:hidden"} cursor-pointer`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu />
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`${isAdmin(user) ? "hidden max-[1179px]:block" : "md:hidden"} overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-80 opacity-100 pb-4" : "max-h-0 opacity-0"
          }`}
        >
          {isAdmin(user) ? (
            // Admin Mobile Navigation
            <ul className="flex flex-col gap-3 text-sm font-medium text-gray-800">
              <li>
                <Link
                  to="/admin"
                  className="block rounded px-3 py-2 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/appointments"
                  className="block rounded px-3 py-2 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Appointment Management
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/haircuts"
                  className="block rounded px-3 py-2 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Haircut Management
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/users"
                  className="block rounded px-3 py-2 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  User Management
                </Link>
              </li>
              {user && (
                <li className="border-t border-gray-200 pt-3 mt-3">
                  <Link
                    to="/account"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/");
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </li>
              )}
            </ul>
          ) : (
            // Regular User Mobile Navigation
            <ul className="flex flex-col gap-3 text-sm font-medium text-gray-800">
              <li>
                <Link
                  to="/home"
                  className="block rounded px-3 py-2 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/appointment"
                  className="block rounded px-3 py-2 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  View Appointment
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionNavigation("gallery")}
                  className="block w-full rounded px-3 py-2 text-left hover:bg-gray-100"
                >
                  Gallery
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionNavigation("contact")}
                  className="block w-full rounded px-3 py-2 text-left hover:bg-gray-100"
                >
                  Contact
                </button>
              </li>
              {!user && (
                <li>
                  <Link
                    to="/account"
                    className="block rounded px-3 py-2 hover:bg-gray-100"
                    onClick={() => setIsOpen(false)}
                  >
                    Account
                  </Link>
                </li>
              )}
              {user && (
                <li className="border-t border-gray-200 pt-3 mt-3">
                  <Link
                    to="/account"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/");
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
}
