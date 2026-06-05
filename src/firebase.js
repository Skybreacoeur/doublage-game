import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Remplace ces valeurs par celles de ton projet Firebase
const firebaseConfig = {
  apiKey: "REMPLACE_PAR_TA_CLE",
  authDomain: "REMPLACE.firebaseapp.com",
  databaseURL: "https://REMPLACE-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "REMPLACE",
  storageBucket: "REMPLACE.appspot.com",
  messagingSenderId: "REMPLACE",
  appId: "REMPLACE"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
