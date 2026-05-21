import googleIcon from "../../assets/images/auth icons/google.png";
import facebookIcon from "../../assets/images/auth icons/facebook.png";
import emailIcon from "../../assets/images/auth icons/email.png";
import {
  signInWithGoogle,
  signInWithFacebook,
  loginWithEmail,
} from "../../services/auth";
import { useState, useEffect, useRef } from "react";
import CreateProfile from "./CreateProfile";
import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../context/AuthContext";

const authIcons = [
  { name: "google", icon: googleIcon },
  { name: "facebook", icon: facebookIcon },
  { name: "email", icon: emailIcon },
];

export default function AuthGate() {
  const [mode, setMode] = useState("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeout = useRef(null);
  const navigate = useNavigate();
  // const { user } = useAuth();

  // // Redirect based on user role after login
  // useEffect(() => {
  //   if (user) {
  //     if (user.role === "admin") {
  //       navigate("/admin");
  //     } else {
  //       navigate("/account");
  //     }
  //   }
  // }, [user, navigate]);

  const showToast = (message) => {
    setToastMessage(message);

    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }

    toastTimeout.current = setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const handleAuthClick = async (providerName) => {
    try {
      if (providerName === "google") {
        await signInWithGoogle();
      } else if (providerName === "facebook") {
        await signInWithFacebook();
      } else if (providerName === "email") {
        setMode("login");
      }
    } catch (error) {
      console.error("Authentication error: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await loginWithEmail(email, password);
    } catch (error) {
      console.error("Email login error:", error);
      const invalidCredentials =
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-email";

      if (invalidCredentials) {
        const message =
          error.code === "auth/user-not-found"
            ? "No account found with that email."
            : error.code === "auth/wrong-password"
            ? "Incorrect password. Please try again."
            : "Please enter a valid email address.";

        showToast(message);
      } else {
        showToast("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white text-center max-w-4xl mx-auto min-h-96 p-6 rounded-2xl shadow-md flex flex-col justify-center items-center space-y-8">
      {mode === "options" && (
        <>
          <h2 className="text-lg md:text-xl lg:text-2xl">
            Login to Continue Booking
          </h2>

          <div className="flex gap-4">
            {authIcons.map((icon) => (
              <button
                key={icon.name}
                className="w-14 h-14 cursor-pointer border border-gray-400 rounded-full hover:scale-105 transition shadow-lg p-2"
                onClick={() => handleAuthClick(icon.name)}
                disabled={loading}
              >
                <img
                  src={icon.icon}
                  alt={icon.name}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 w-full max-w-xs">
            <div className="h-px flex-1 bg-gray-300"></div>
            <p className="text-xl md:text-2xl">or</p>
            <div className="h-px flex-1 bg-gray-300"></div>
          </div>

          <button
            onClick={() => setMode("signup")}
            className="text-lg md:text-xl border-b border-gray-500 font-semibold pb-1 cursor-pointer"
          >
            Create profile
          </button>
        </>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
          <div className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-black/20">
            {toastMessage}
          </div>
        </div>
      )}

      {mode === "login" && (
        <form
          onSubmit={handleEmailLogin}
          className="w-full max-w-md flex flex-col gap-4"
        >
          <h2 className="text-lg md:text-xl lg:text-2xl font-semibold">
            Login
          </h2>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white rounded-xl py-3 font-semibold hover:opacity-90 transition cursor-pointer"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            onClick={() => setMode("options")}
            className="text-sm text-gray-500 hover:underline cursor-pointer"
          >
            Back
          </button>
        </form>
      )}

      {mode === "signup" && <CreateProfile onSetMode={setMode} />}
    </section>
  );
}
