import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

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
      role: "user",
      active: true,
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

export function subscribeCustomerAccounts(onData, onError) {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const accounts = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .filter((account) => (account.role || "user") !== "admin");

      onData(accounts);
    },
    onError,
  );
}

export async function updateCustomerAccount(userId, data) {
  const ref = doc(db, "users", userId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function setCustomerAccountActive(userId, active) {
  const ref = doc(db, "users", userId);

  await updateDoc(ref, {
    active,
    updatedAt: serverTimestamp(),
  });
}
