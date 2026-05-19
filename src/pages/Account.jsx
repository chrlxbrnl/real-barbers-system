import { useState, useEffect } from "react";
import { getUserProfile, saveUserProfile } from "../services/users";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import AuthGate from "../components/auth/AuthGate";
import { updatePassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function Account() {
  const { user, logout } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const data = await getUserProfile(user);

      if (data) {
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setPhone(data.phone || "");
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please log in again before updating your account.");
        return;
      }

      const fullName = `${firstName} ${lastName}`.trim();

      // Save profile (Firestore)
      await saveUserProfile(user, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        phone: phone.trim(),
      });

      // Sync name to Firebase Auth
      if (fullName && fullName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: fullName,
        });
      }

      // Handle password update
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          alert("Passwords do not match");
          return;
        }

        if (password.length < 6) {
          alert("Password must be at least 6 characters");
          return;
        }

        await updatePassword(currentUser, password);

        // clear inputs
        setPassword("");
        setConfirmPassword("");
      }

      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);

      // Handle common Firebase error
      if (err.code === "auth/requires-recent-login") {
        alert("Please log in again before changing password.");
      } else {
        alert("Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="bg-[#f5f5f5] min-h-screen">
        {/* Skeleton NavBar */}
        <nav className="bg-white shadow-sm border-b border-gray-200 animate-pulse">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-300 rounded w-32"></div>
              <div className="flex gap-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        </nav>
        <div className="max-w-5xl mx-auto mt-10 bg-white rounded-2xl p-8 shadow animate-pulse">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen">
        <NavBar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <AuthGate />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <NavBar />

      <div className="max-w-5xl mx-auto mt-10 bg-white rounded-2xl p-8 shadow">
        <div className="grid md:grid-cols-2 gap-10">
          {/* LEFT SIDE */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Account settings</h2>

            {/* Profile */}
            <div className="flex items-center gap-4 mb-4">
              <img
                src={
                  user?.photoURL ||
                  "https://ui-avatars.com/api/?name=" +
                    (user?.displayName || "User")
                }
                className="w-14 h-14 rounded-full"
              />
              <span className="text-sm text-gray-600 cursor-pointer">
                Click here to change profile picture
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Personal information and phone number
            </p>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border rounded-full px-4 py-2 text-sm"
              />
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border rounded-full px-4 py-2 text-sm"
              />
            </div>

            <input
              placeholder="Email address"
              value={user?.email || ""}
              disabled
              className="border rounded-full px-4 py-2 text-sm w-full mb-4 bg-gray-100"
            />

            <input
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border rounded-full px-4 py-2 text-sm w-full mb-4"
            />

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-black text-white px-4 py-2 rounded-full text-sm hover:bg-gray-800 disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* RIGHT SIDE */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Security</h2>

            <div className="space-y-3">
              <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border rounded-full px-4 py-2 text-sm w-full"
              />

              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border rounded-full px-4 py-2 text-sm w-full"
              />
            </div>
          </div>
        </div>

        {/* Logout bottom right */}
        <div className="flex justify-end mt-6">
          <button onClick={logout} className="text-sm underline text-gray-600">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
