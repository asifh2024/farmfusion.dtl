import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getDoc,
    doc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';


window.togglePassword = function(button) {
    const inputGroup = button.closest('.password-input-group');
    const input = inputGroup.querySelector('input');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
};


window.closeErrorCard = function() {
    const errorCard = document.getElementById('errorCard');
    const errorOverlay = document.getElementById('errorOverlay');
    
    if (errorCard) {
        errorCard.classList.remove('show');
    }
    if (errorOverlay) {
        errorOverlay.classList.remove('show');
    }
    
    console.log('✅ Error card closed');
};


const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            showError('Please fill all fields');
            return;
        }

        try {
            console.log('🔐 Attempting admin login...');
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('✅ Firebase Auth successful:', user.uid);

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                showError('User data not found. Please contact support.');
                await auth.signOut();
                return;
            }

            const userData = userDoc.data();
            console.log('📄 User data:', userData);

            if (!userData.isAdmin || userData.isAdmin !== true) {
                showError('Access Denied: You are not authorized as an admin');
                await auth.signOut();
                return;
            }

            console.log('✅ Admin verified! Redirecting...');
            window.location.href = 'admin-dashboard.html';

        } catch (error) {
            console.error('❌ Admin login error:', error);
            
           
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                showError('Invalid admin credentials. Please check your email and password.');
            } else if (error.code === 'auth/user-not-found') {
                showError('Admin account not found. Please verify your email address.');
            } else if (error.code === 'auth/too-many-requests') {
                showError('Too many failed login attempts. Please try again later.');
            } else if (error.code === 'auth/network-request-failed') {
                showError('Network error. Please check your internet connection.');
            } else if (error.code === 'auth/invalid-email') {
                showError('Invalid email address format.');
            } else {
                showError('Login failed: ' + error.message);
            }
        }
    });
}


function showError(message) {
    const errorCard = document.getElementById('errorCard');
    const errorOverlay = document.getElementById('errorOverlay');
    const errorMessage = document.getElementById('errorCardMessage');
    const errorIcon = document.querySelector('.error-icon i');
    
    if (errorCard && errorOverlay && errorMessage) {
        errorMessage.textContent = message;
        
       
        if (errorIcon) {
            if (message.includes('Access Denied')) {
                errorIcon.className = 'fas fa-shield-alt';
            } else if (message.includes('Invalid')) {
                errorIcon.className = 'fas fa-exclamation-triangle';
            } else if (message.includes('Network')) {
                errorIcon.className = 'fas fa-wifi';
            } else if (message.includes('not found')) {
                errorIcon.className = 'fas fa-user-slash';
            } else {
                errorIcon.className = 'fas fa-times-circle';
            }
        }
        
        errorCard.classList.add('show');
        errorOverlay.classList.add('show');
        
        console.log('❌ Error shown:', message);
    } else {
        
        alert(message);
    }
}
