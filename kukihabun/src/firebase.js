import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBoSmJxvC2m09XNkuijKddA0EuawcIOVZo",
  authDomain: "kukihabun-customer.firebaseapp.com",
  projectId: "kukihabun-customer",
  storageBucket: "kukihabun-customer.firebasestorage.app",
  messagingSenderId: "537634637839",
  appId: "1:537634637839:web:83fc8fe35bec132d5e7b7a",
  measurementId: "G-BP1RYW8TGK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
