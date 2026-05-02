import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupWithEmail } from "../../services/auth";

export default function CreateProfile({ onSetMode }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await signupWithEmail(fullName, email, password);
      navigate("/appointment");
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="w-full max-w-md flex flex-col gap-4">
      <h2 className="text-lg md:text-xl lg:text-2xl">Create your profile</h2>

      <input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3"
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3"
      />

      <button type="submit" disabled={loading} className="bg-black text-white rounded-xl py-3 font-semibold hover:opacity-90 transition cursor-pointer">
        {loading ? "Creating..." : "Create Account"}
      </button>

      <button
        type="button"
        onClick={() => onSetMode("options")}
        className="text-sm text-gray-500 hover:underline cursor-pointer"
      >
        Back
      </button>
    </form>
  );
}
