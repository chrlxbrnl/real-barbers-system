import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCBIzmIaWVpaY0gRZcZhtq18OxvdeGrNZg",
  authDomain: "real-barbers.firebaseapp.com",
  projectId: "real-barbers",
  storageBucket: "real-barbers.firebasestorage.app",
  messagingSenderId: "1083070246317",
  appId: "1:1083070246317:web:c9fc4e311f3e1d21d2c524",
  measurementId: "G-R9EGN0C290"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { app, auth, db, storage };
