import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Substitua com suas credenciais do Firebase Console
// Acesse: https://console.firebase.google.com > Seu Projeto > Configurações > Config
const firebaseConfig = {
  apiKey: "AIzaSyCplfmZQxBbc_E6NuLSHnqhRY9YfOhOAEE",
  authDomain: "dashboard-9639f.firebaseapp.com",
  projectId: "dashboard-9639f",
  storageBucket: "dashboard-9639f.firebasestorage.app",
  messagingSenderId: "375091114358",
  appId: "1:375091114358:web:8115acf8b3a36d89f88a57",
  measurementId: "G-HJ9PJ98KHZ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
