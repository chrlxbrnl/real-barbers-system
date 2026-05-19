import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export function subscribeReviews(onData, onError) {
  const reviewsQuery = query(
    collection(db, "reviews"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    reviewsQuery,
    (snapshot) => {
      const reviewList = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      onData(reviewList);
    },
    onError,
  );
}

export async function createReview(user, review) {
  const reviewerName =
    user?.displayName || user?.email?.split("@")[0] || "Anonymous";

  await addDoc(collection(db, "reviews"), {
    userId: user.uid,
    name: reviewerName,
    rating: Number(review.rating),
    comment: review.comment?.trim() || "",
    createdAt: serverTimestamp(),
  });
}
