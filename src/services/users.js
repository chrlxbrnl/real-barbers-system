import { db } from "../firebase/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// CREATE USER IF NOT EXISTS
export async function createUserIfNotExists(user) {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      email: user.email,
      firstName: "",
      lastName: "",
      phone: "",
      role: "user", // 🔥 default role
      createdAt: serverTimestamp(),
    });
  }
}

export async function saveUserProfile(user, data) {
  const ref = doc(db, "users", user.uid);

  await setDoc(
    ref,
    {
      ...data,
      email: user.email,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// Get profile
export async function getUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return snapshot.data();
  } else {
    return null;
  }
}
