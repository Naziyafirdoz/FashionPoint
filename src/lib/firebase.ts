import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyClfF5PtFLmzSLQ2Yd3wvbdhfWQj0aOL-4",
    authDomain: "fashion-point-7e433.firebaseapp.com",
    projectId: "fashion-point-7e433",
    storageBucket: "fashion-point-7e433.firebasestorage.app",
    messagingSenderId: "1093769699821",
    appId: "1:1093769699821:web:d5bbb8f03d94dde2cf87e4"
};

export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);