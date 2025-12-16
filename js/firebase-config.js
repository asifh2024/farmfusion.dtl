import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDWc8unDlSSYQkfyV0AoNRTLfSJn1anlk0",
  authDomain: "farmfusion-e9ec2.firebaseapp.com",
  projectId: "farmfusion-e9ec2",
  storageBucket: "farmfusion-e9ec2.firebasestorage.app",
  messagingSenderId: "654431167588",
  appId: "1:654431167588:web:21d0f518751541b0056b71"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
