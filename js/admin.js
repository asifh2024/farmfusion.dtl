import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    deleteDoc,
    query,
    where,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    initializeApp,
    deleteApp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';


const firebaseConfig = {
    apiKey: "AIzaSyDWc8unDlSSYQkfyV0AoNRTLfSJn1anlk0",
    authDomain: "farmfusion-e9ec2.firebaseapp.com",
    projectId: "farmfusion-e9ec2",
    storageBucket: "farmfusion-e9ec2.firebasestorage.app",
    messagingSenderId: "654431167588",
    appId: "1:654431167588:web:21d0f518751541b0056b71"
};

let currentUserType = null;


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.error('❌ No user logged in');
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            console.error('❌ User document not found');
            alert('User data not found. Please contact support.');
            await signOut(auth);
            window.location.href = 'admin-login.html';
            return;
        }

        const userData = userDoc.data();

        if (!userData.isAdmin || userData.isAdmin !== true) {
            console.error('❌ Not an admin user');
            alert('Unauthorized access! Only admins allowed.');
            await signOut(auth);
            window.location.href = 'admin-login.html';
            return;
        }

        console.log('✅ Admin verified successfully');
        document.getElementById('adminEmail').textContent = user.email;
        loadDashboard();

    } catch (error) {
        console.error('❌ Admin check error:', error);
        alert('Authentication error: ' + error.message);
        await signOut(auth);
        window.location.href = 'admin-login.html';
    }
});


async function loadDashboard() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let farmers = 0, buyers = 0;

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userType === 'farmer') farmers++;
            if (data.userType === 'buyer') buyers++;
        });

        const cropsSnapshot = await getDocs(collection(db, 'crops'));

        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        document.getElementById('totalFarmers').textContent = farmers;
        document.getElementById('totalBuyers').textContent = buyers;
        document.getElementById('totalProducts').textContent = cropsSnapshot.size;

        console.log('✅ Dashboard stats loaded');

        loadFarmers();
        loadBuyers();
        loadProducts();
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        alert('Dashboard error: ' + error.message);
    }
}


async function loadFarmers() {
    try {
        const q = query(collection(db, 'users'), where('userType', '==', 'farmer'));
        const snapshot = await getDocs(q);

        const tbody = document.getElementById('farmersTable');

        if (!tbody) {
            console.error('❌ farmersTable element not found');
            return;
        }

        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No farmers found</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = `
                <tr>
                    <td>${data.fullName || 'N/A'}</td>
                    <td>${data.email || 'N/A'}</td>
                    <td>${data.phone || 'N/A'}</td>
                    <td>${data.state || 'N/A'}</td>
                    <td>${formatDate(data.createdAt)}</td>
                    <td>
                        <button class="action-btn btn-edit" onclick="viewUser('${doc.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteUser('${doc.id}', '${data.email}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        console.log(`✅ Loaded ${snapshot.size} farmers`);
    } catch (error) {
        console.error('❌ Error loading farmers:', error);
        const tbody = document.getElementById('farmersTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading farmers</td></tr>';
        }
    }
}


async function loadBuyers() {
    try {
        const q = query(collection(db, 'users'), where('userType', '==', 'buyer'));
        const snapshot = await getDocs(q);

        const tbody = document.getElementById('buyersTable');

        if (!tbody) {
            console.error('❌ buyersTable element not found');
            return;
        }

        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No buyers found</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = `
                <tr>
                    <td>${data.fullName || 'N/A'}</td>
                    <td>${data.email || 'N/A'}</td>
                    <td>${data.phone || 'N/A'}</td>
                    <td>${data.businessName || 'N/A'}</td>
                    <td>${formatDate(data.createdAt)}</td>
                    <td>
                        <button class="action-btn btn-edit" onclick="viewUser('${doc.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteUser('${doc.id}', '${data.email}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        console.log(`✅ Loaded ${snapshot.size} buyers`);
    } catch (error) {
        console.error('❌ Error loading buyers:', error);
        const tbody = document.getElementById('buyersTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading buyers</td></tr>';
        }
    }
}


async function loadProducts() {
    try {
        const snapshot = await getDocs(collection(db, 'crops'));
        const container = document.getElementById('productsContainer');

        if (!container) {
            console.error('❌ productsContainer not found');
            return;
        }

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products found</p></div>';
            return;
        }

        for (const productDoc of snapshot.docs) {
            const data = productDoc.data();
            let farmerName = 'Unknown Farmer';
            let farmerLocation = 'Location not available';


            if (data.farmerId) {
                try {
                    const farmerDoc = await getDoc(doc(db, 'users', data.farmerId));
                    if (farmerDoc.exists()) {
                        const farmerData = farmerDoc.data();
                        farmerName = farmerData.fullName || 'Unknown Farmer';


                        const district = farmerData.district || '';
                        const state = farmerData.state || '';

                        if (district && state) {
                            farmerLocation = `${district}, ${state}`;
                        } else if (state) {
                            farmerLocation = state;
                        } else if (district) {
                            farmerLocation = district;
                        } else {
                            farmerLocation = 'Location not specified';
                        }
                    }
                } catch (e) {
                    console.log('⚠️ Farmer lookup failed:', e);
                }
            }

            const card = `
                <div class="crop-card">
                    <img src="${data.imageUrl || 'https://via.placeholder.com/300x200/90EE90/228B22?text=No+Image'}" 
                         alt="${data.cropName}" 
                         class="crop-image"
                         onerror="this.src='https://via.placeholder.com/300x200/90EE90/228B22?text=No+Image'">
                    <div class="crop-details">
                        <div class="crop-header">
                            <h3 class="crop-name">${data.cropName || 'N/A'}</h3>
                            <span class="status-badge status-${data.status || 'available'}">${data.status || 'available'}</span>
                        </div>
                        
                        <!-- Farmer Info -->
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--primary-color);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <i class="fas fa-user" style="color: var(--primary-color);"></i>
                                <span style="font-weight: 600; color: var(--text-dark);">${farmerName}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                                <span style="color: var(--text-light); font-size: 0.9rem;">${farmerLocation}</span>
                            </div>
                        </div>
                        
                        <div class="crop-info">
                            <div class="info-row">
                                <span class="info-label"><i class="fas fa-tag"></i> Category:</span>
                                <span class="info-value">${data.category || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label"><i class="fas fa-rupee-sign"></i> Price:</span>
                                <span class="info-value">₹${data.price || 0}/kg</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label"><i class="fas fa-weight"></i> Quantity:</span>
                                <span class="info-value">${data.quantity || 0} kg</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label"><i class="fas fa-star"></i> Quality:</span>
                                <span class="info-value">${data.quality || 'Standard'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label"><i class="fas fa-calendar"></i> Harvest:</span>
                                <span class="info-value">${data.harvestDate ? new Date(data.harvestDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                            </div>
                        </div>
                        
                        ${data.description ? `<p style="color: #7f8c8d; font-size: 0.9rem; margin: 1rem 0; line-height: 1.4;"><strong>Description:</strong> ${data.description}</p>` : ''}
                        
                        <div class="card-actions" style="margin-top: 1rem;">
                            <button class="btn btn-danger btn-full" onclick="deleteProduct('${productDoc.id}')">
                                <i class="fas fa-trash"></i> Delete Product
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        }

        console.log(`✅ Loaded ${snapshot.size} products with farmer locations`);
    } catch (error) {
        console.error('❌ Error loading products:', error);
        const container = document.getElementById('productsContainer');
        if (container) {
            container.innerHTML = '<div class="empty-state" style="color: red;"><i class="fas fa-exclamation-circle"></i><p>Error loading products</p></div>';
        }
    }
}




window.showSection = function (section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const sectionElement = document.getElementById(section);
    if (sectionElement) {
        sectionElement.classList.add('active');
    }

    const activeLink = document.querySelector(`[onclick*="showSection('${section}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    const titles = {
        dashboard: 'Dashboard Overview',
        farmers: 'Manage Farmers',
        buyers: 'Manage Buyers',
        products: 'All Products'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[section] || 'Dashboard';
    }
};


window.showAddUserModal = function (userType) {
    currentUserType = userType;

    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const userForm = document.getElementById('userForm');
    const farmerFields = document.getElementById('farmerFields');
    const buyerFields = document.getElementById('buyerFields');

    if (!modal || !modalTitle || !userForm || !farmerFields || !buyerFields) {
        console.error('❌ Modal elements not found');
        return;
    }

    userForm.reset();
    modalTitle.textContent = `Add ${userType.charAt(0).toUpperCase() + userType.slice(1)}`;

    if (userType === 'farmer') {
        farmerFields.style.display = 'block';
        buyerFields.style.display = 'none';
        document.getElementById('farmerState').required = true;
        document.getElementById('farmerDistrict').required = true;
    } else {
        farmerFields.style.display = 'none';
        buyerFields.style.display = 'block';
        document.getElementById('farmerState').required = false;
        document.getElementById('farmerDistrict').required = false;
    }

    modal.classList.add('show');
    modal.style.display = 'flex';
};

window.closeModal = function () {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.reset();
    }
};


const userForm = document.getElementById('userForm');
if (userForm) {
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('userEmail').value.trim();
        const password = document.getElementById('userPassword').value;
        const fullName = document.getElementById('userName').value.trim();
        const phone = document.getElementById('userPhone').value.trim();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;

        let secondaryApp = null;

        try {
            console.log('🔄 Creating user:', email);


            secondaryApp = initializeApp(firebaseConfig, 'Secondary-' + Date.now());
            const secondaryAuth = getAuth(secondaryApp);

            console.log('✅ Secondary app created');


            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            console.log('✅ User created in Auth:', user.uid);


            const userData = {
                email,
                fullName,
                phone,
                userType: currentUserType,
                createdAt: Timestamp.now(),
                isAdmin: false,
                uid: user.uid
            };


            if (currentUserType === 'farmer') {
                userData.state = document.getElementById('farmerState').value.trim();
                userData.district = document.getElementById('farmerDistrict').value.trim();
            } else if (currentUserType === 'buyer') {
                userData.businessName = document.getElementById('buyerCompany').value.trim();
                userData.businessType = document.getElementById('buyerType').value;
            }


            await setDoc(doc(db, 'users', user.uid), userData);
            console.log('✅ User data saved to Firestore');

            await secondaryAuth.signOut();
            await deleteApp(secondaryApp);
            secondaryApp = null;
            console.log('✅ Secondary app cleaned up successfully');

            alert(`${currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)} added successfully!`);
            closeModal();
            loadDashboard();

        } catch (error) {
            console.error('❌ Error creating user:', error);

            if (secondaryApp) {
                try {
                    await deleteApp(secondaryApp);
                    console.log('✅ Secondary app cleaned up after error');
                } catch (cleanupError) {
                    console.error('⚠️ Cleanup error:', cleanupError);
                }
            }

            let errorMessage = 'Error: ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'This email is already registered.';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Password must be at least 6 characters.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email format.';
                    break;
                case 'permission-denied':
                    errorMessage += 'Permission denied. Check Firestore security rules.';
                    break;
                default:
                    errorMessage += error.message;
            }

            alert(errorMessage);
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}


window.viewUser = async function (userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const formattedData = JSON.stringify(userData, null, 2);
            alert('User Details:\n\n' + formattedData);
        } else {
            alert('User not found!');
        }
    } catch (error) {
        console.error('Error viewing user:', error);
        alert('Error loading user details: ' + error.message);
    }
};

window.deleteUser = async function (userId, email) {
    if (!confirm(`Are you sure you want to delete user:\n${email}?`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'users', userId));
        alert('User deleted successfully!');
        loadDashboard();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
};

window.deleteProduct = async function (productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'crops', productId));
        alert('Product deleted successfully!');
        loadProducts();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product: ' + error.message);
    }
};


window.handleLogout = async function () {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    try {
        await signOut(auth);
        sessionStorage.clear();
        console.log('✅ Admin logged out successfully');
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('❌ Logout error:', error);
        alert('Error logging out: ' + error.message);
    }
};


function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('en-IN');
        } else if (timestamp instanceof Date) {
            return timestamp.toLocaleDateString('en-IN');
        } else {
            return new Date(timestamp).toLocaleDateString('en-IN');
        }
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'N/A';
    }
}


document.addEventListener('DOMContentLoaded', function () {
    if (window.innerWidth <= 600) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        const sidebar = document.querySelector('.admin-sidebar');
        const adminHeader = document.querySelector('.admin-header');

        if (adminHeader && sidebar) {
            adminHeader.addEventListener('click', function (e) {
                if (e.target === adminHeader || e.target.tagName === 'H1') {
                    sidebar.classList.toggle('active');
                    overlay.classList.toggle('active');
                }
            });

            overlay.addEventListener('click', function () {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });

            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', function () {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            });
        }
    }
});

console.log('✅ Admin dashboard script loaded successfully');
