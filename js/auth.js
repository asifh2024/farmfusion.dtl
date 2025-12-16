import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

window.togglePassword = function (button) {
  const inputGroup = button.closest('.password-input-group');
  const input = inputGroup.querySelector('input');
  const icon = button.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
    button.classList.add('show');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
    button.classList.remove('show');
  }
};

function showError(message) {
  alert('❌ ' + message);
}

function showSuccess(message) {
  alert('✅ ' + message);
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;

    if (!email || !password || !userType) {
      showError('Please fill all fields');
      return;
    }

    try {
      console.log('🔐 Attempting login...');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('✅ Firebase Auth successful:', user.uid);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        showError('User data not found. Please contact support.');
        await signOut(auth);
        return;
      }

      const userData = userDoc.data();
      console.log('📄 User data:', userData);

      if (userData.userType !== userType) {
        showError(`This account is registered as ${userData.userType}, not ${userType}`);
        await signOut(auth);
        return;
      }

      console.log('✅ Login successful! Redirecting...');

      if (userType === 'farmer') {
        window.location.href = 'farmer-dashboard.html';
      } else if (userType === 'buyer') {
        window.location.href = 'buyer-dashboard.html';
      }

    } catch (error) {
      console.error('❌ Login error:', error);

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        showError('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        showError('No account found with this email');
      } else if (error.code === 'auth/too-many-requests') {
        showError('Too many failed attempts. Try again later');
      } else if (error.code === 'auth/network-request-failed') {
        showError('Network error. Check your internet connection');
      } else if (error.code === 'auth/invalid-email') {
        showError('Invalid email address format');
      } else {
        showError('Login failed: ' + error.message);
      }
    }
  });
}

function logout() {
  signOut(auth)
    .then(() => {
      console.log('✅ User logged out successfully');
      window.location.href = 'index.html';
    })
    .catch((error) => {
      console.error('❌ Logout error:', error);
      alert('Logout failed: ' + error.message);
    });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('logout-link')) {
    e.preventDefault();
    logout();
  }
});

window.logout = logout;
