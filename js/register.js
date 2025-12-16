import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { setDoc, doc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';


window.togglePassword = function (button) {
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


const userTypeSelect = document.getElementById('userType');
const dynamicFields = document.getElementById('dynamicFields');

if (userTypeSelect && dynamicFields) {
    userTypeSelect.addEventListener('change', function () {
        const userType = this.value;

        if (userType === 'farmer') {
            dynamicFields.innerHTML = `
                <div class="form-group">
                    <label for="state">State *</label>
                    <div class="input-group">
                        <i class="fas fa-map-marker-alt"></i>
                        <select id="state" name="state" required>
                            <option value="">Select State</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="West Bengal">West Bengal</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="district">District *</label>
                    <div class="input-group">
                        <i class="fas fa-map-pin"></i>
                        <input type="text" id="district" name="district" placeholder="Enter your district" required>
                    </div>
                </div>
            `;
        } else if (userType === 'buyer') {
            dynamicFields.innerHTML = `
                <div class="form-group">
                    <label for="businessName">Business Name</label>
                    <div class="input-group">
                        <i class="fas fa-building"></i>
                        <input type="text" id="businessName" name="businessName" placeholder="Enter business name">
                    </div>
                </div>
                <div class="form-group">
                    <label for="businessType">Business Type *</label>
                    <div class="input-group">
                        <i class="fas fa-briefcase"></i>
                        <select id="businessType" name="businessType" required>
                            <option value="">Select Type</option>
                            <option value="wholesaler">Wholesaler</option>
                            <option value="retailer">Retailer</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="individual">Individual Buyer</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="state">State *</label>
                    <div class="input-group">
                        <i class="fas fa-map-marker-alt"></i>
                        <select id="state" name="state" required>
                            <option value="">Select State</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="West Bengal">West Bengal</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="city">City *</label>
                    <div class="input-group">
                        <i class="fas fa-city"></i>
                        <input type="text" id="city" name="city" placeholder="Enter your city" required>
                    </div>
                </div>
            `;
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userType = document.getElementById('userType').value;
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;

        if (!userType) {
            showError('Please select user type');
            return;
        }

        try {
            console.log('🔄 Creating user account...');


            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('✅ User created:', user.uid);


            const userData = {
                userType,
                fullName,
                email,
                phone,
                createdAt: Timestamp.now(),
                isAdmin: false
            };


            if (userType === 'farmer') {
                userData.state = document.getElementById('state').value;
                userData.district = document.getElementById('district').value.trim();
            } else if (userType === 'buyer') {
                userData.businessName = document.getElementById('businessName')?.value.trim() || '';
                userData.businessType = document.getElementById('businessType').value;
                userData.state = document.getElementById('state').value;
                userData.city = document.getElementById('city').value.trim();
            }

            console.log('💾 Saving user data to Firestore...');
            await setDoc(doc(db, 'users', user.uid), userData);

            console.log('✅ Registration complete!');
            showSuccess('✅ Registration successful! Redirecting...');

            setTimeout(() => {
                if (userType === 'farmer') {
                    window.location.href = 'farmer-dashboard.html';
                } else {
                    window.location.href = 'buyer-dashboard.html';
                }
            }, 1500);

        } catch (error) {
            console.error('❌ Registration error:', error);


            if (error.code === 'auth/email-already-in-use') {
                showError('This email is already registered. Please login instead.');
            } else if (error.code === 'auth/weak-password') {
                showError('Password should be at least 6 characters.');
            } else if (error.code === 'auth/invalid-email') {
                showError('Invalid email address.');
            } else if (error.code === 'auth/network-request-failed') {
                showError('Network error. Check your internet connection.');
            } else {
                showError('Registration failed: ' + error.message);
            }
        }
    });
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}


registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();


    const privacyConsent = document.getElementById('privacyConsent');
    if (!privacyConsent.checked) {
        showError('Please accept the Privacy Policy to continue.');
        return;
    }


    const userType = document.getElementById('userType').value;
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;


    const userData = {
        email,
        fullName,
        phone,
        userType,
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedDate: Timestamp.now(),
        privacyPolicyVersion: '1.0',

        createdAt: Timestamp.now()
    };

});
