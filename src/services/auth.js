import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

async function createUserDoc(user, extraData = {}) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      fullName: extraData.fullName || user.displayName || "",
      email: user.email || "",
      provider: extraData.provider || "unknown",
      role: "user",
      active: true,
      createdAt: serverTimestamp(),
    });
  }
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await createUserDoc(result.user, { provider: "google" });
  return result.user;
}

export async function signInWithFacebook() {
  const result = await signInWithPopup(auth, facebookProvider);
  await createUserDoc(result.user, { provider: "facebook" });
  return result.user;
}

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signupWithEmail(fullName, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(result.user, {
    displayName: fullName,
  });

  await setDoc(doc(db, "users", result.user.uid), {
    uid: result.user.uid,
    fullName,
    email,
    provider: "password",
    role: "user",
    active: true,
    createdAt: serverTimestamp(),
  });

  return result.user;
}
