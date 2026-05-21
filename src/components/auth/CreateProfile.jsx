import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupWithEmail, validatePassword } from "../../services/auth";

export default function CreateProfile({ onSetMode }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  const passwordValidation = validatePassword(password);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!passwordValidation.isValid) {
      setPasswordError("Password must meet all requirements");
      return;
    }

    try {
      setLoading(true);
      setPasswordError("");
      await signupWithEmail(fullName, email, password);
      navigate("/appointment");
    } catch (error) {
      console.error("Signup error:", error);
      setPasswordError(error.message || "Signup failed");
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
        required
        className="w-full border border-gray-300 rounded-xl px-4 py-3"
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-xl px-4 py-3"
      />

      <div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError("");
          }}
          className={`w-full border rounded-xl px-4 py-3 ${
            password && !passwordValidation.isValid
              ? "border-red-500"
              : "border-gray-300"
          }`}
        />
        
        <div className="mt-3 text-sm space-y-2">
          <p className="font-semibold text-gray-700">Password Requirements:</p>
          <div className="space-y-1">
            <div
              className={`flex items-center gap-2 ${
                passwordValidation.hasUppercase
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <span>{passwordValidation.hasUppercase ? "✓" : "○"}</span>
              <span>1 Uppercase Letter (A-Z)</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                passwordValidation.hasNumber ? "text-green-600" : "text-gray-400"
              }`}
            >
              <span>{passwordValidation.hasNumber ? "✓" : "○"}</span>
              <span>1 Number (0-9)</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                passwordValidation.hasSpecialChar
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <span>{passwordValidation.hasSpecialChar ? "✓" : "○"}</span>
              <span>1 Special Character (!@#$%^&*)</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                passwordValidation.isMinLength
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <span>{passwordValidation.isMinLength ? "✓" : "○"}</span>
              <span>Minimum 8 Characters</span>
            </div>
          </div>
        </div>

        {passwordError && (
          <p className="text-red-600 text-sm mt-2">{passwordError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !passwordValidation.isValid}
        className="bg-black text-white rounded-xl py-3 font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
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
