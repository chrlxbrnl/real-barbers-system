import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const haircutStylesCollection = collection(db, "haircutStyles");

export function subscribeHaircutStyleOverrides(onChange, onError) {
  const q = query(haircutStylesCollection, orderBy("name", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        })),
      );
    },
    onError,
  );
}

export async function addHaircutStyle(style) {
  return addDoc(haircutStylesCollection, {
    ...style,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateHaircutStyle(styleId, style) {
  const styleRef = doc(db, "haircutStyles", styleId);

  return setDoc(
    styleRef,
    {
      ...style,
      deleted: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteHaircutStyle(style) {
  const styleRef = doc(db, "haircutStyles", style.id);

  if (style.isDefault) {
    return setDoc(
      styleRef,
      {
        name: style.name,
        faceShape: style.faceShape,
        deleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return deleteDoc(styleRef);
}

export async function restoreHaircutStyle(styleId) {
  return updateDoc(doc(db, "haircutStyles", styleId), {
    deleted: false,
    updatedAt: serverTimestamp(),
  });
}
