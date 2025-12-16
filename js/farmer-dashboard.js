import { auth, db } from './firebase-config.js';
import {
  addDoc,
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log('❌ No user logged in, redirecting to login...');
    window.location.href = 'login.html';
    return;
  }

  console.log('✅ User logged in:', user.uid);
  currentUser = user;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      console.log('⚠️ User data not found');
      await signOut(auth);
      window.location.href = 'login.html';
      return;
    }

    const userData = userDoc.data();
    console.log('📄 User type:', userData.userType);

    if (userData.userType !== 'farmer') {
      console.log('🚫 Access denied: Not a farmer!');
      alert('⛔ Access Denied: This page is for farmers only!');

      if (userData.userType === 'buyer') {
        window.location.href = 'buyer-dashboard.html';
      } else if (userData.userType === 'admin' || userData.isAdmin) {
        window.location.href = 'admin-dashboard.html';
      } else {
        await signOut(auth);
        window.location.href = 'login.html';
      }
      return;
    }

    console.log('✅ Farmer access granted');
    await loadUserData();
    await loadCrops();

  } catch (error) {
    console.error('❌ Auth check error:', error);
    alert('Error verifying access. Please login again.');
    await signOut(auth);
    window.location.href = 'login.html';
  }
});

const CLOUDINARY_CLOUD_NAME = 'df5emaq6u';
const CLOUDINARY_UPLOAD_PRESET = 'farmfusion_unsigned';

function uploadCropImageToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  return fetch(url, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => data.secure_url);
}

async function loadUserData() {
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const farmerData = userDoc.data();
      const userName = farmerData.fullName || farmerData.businessName || 'Farmer';
      const userNameEl = document.getElementById('userName');
      if (userNameEl) {
        userNameEl.textContent = `Welcome, ${userName}`;
      }
      console.log('✅ Farmer data loaded:', userName);
    }
  } catch (error) {
    console.error('❌ Error loading farmer data:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addCropForm = document.getElementById('addCropForm');

  if (addCropForm) {
    addCropForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) {
        alert('You must be logged in as a farmer to add crops.');
        return;
      }

      const submitBtn = addCropForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
      submitBtn.disabled = true;

      try {
        const cropName = document.getElementById('cropName').value.trim();
        const cropCategory = document.getElementById('cropCategory').value;
        const quantity = parseFloat(document.getElementById('quantity').value);
        const price = parseFloat(document.getElementById('price').value);
        const harvestDate = document.getElementById('harvestDate').value;
        const quality = document.getElementById('quality').value;
        const description = document.getElementById('description').value.trim();
        const imageFile = document.getElementById('cropImage').files[0];

        if (!cropName || !cropCategory || !quantity || !price || !harvestDate || !quality) {
          alert('Please fill all required fields.');
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          return;
        }

        let imageUrl = '';
        if (imageFile) {
          console.log('📤 Uploading image...');
          imageUrl = await uploadCropImageToCloudinary(imageFile);
          console.log('✅ Image uploaded:', imageUrl);
        }

        console.log('💾 Saving crop to Firestore...');
        await addDoc(collection(db, 'crops'), {
          cropName,
          category: cropCategory,
          quantity,
          price,
          harvestDate,
          quality,
          description,
          imageUrl,
          farmerId: currentUser.uid,
          status: 'available',
          createdAt: new Date().toISOString()
        });

        addCropForm.reset();
        alert('✅ Crop added successfully!');
        await loadCrops();
        updateStats();

      } catch (err) {
        console.error('❌ Crop save error:', err);
        alert('❌ Failed to save crop: ' + err.message);
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
});

async function loadCrops() {
  try {
    if (!currentUser) {
      console.log('❌ No user, skipping crops load');
      return;
    }

    console.log('🔄 Loading farmer crops...');
    const querySnapshot = await getDocs(collection(db, 'crops'));
    const cropsContainer = document.getElementById('cropsContainer');

    if (!cropsContainer) {
      console.error('❌ cropsContainer not found');
      return;
    }

    cropsContainer.innerHTML = '';

    let farmerCropCount = 0;
    querySnapshot.forEach((doc) => {
      const cropData = doc.data();
      if (cropData.farmerId === currentUser.uid) {
        const crop = { id: doc.id, ...cropData };
        const cropCard = createCropCard(crop);
        cropsContainer.appendChild(cropCard);
        farmerCropCount++;
      }
    });

    if (farmerCropCount === 0) {
      cropsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-light);">
          <i class="fas fa-seedling" style="font-size: 4rem; color: #ddd; margin-bottom: 1rem;"></i>
          <p>No crops listed yet. Add your first crop above!</p>
        </div>
      `;
    }

    updateStats(farmerCropCount);
    console.log(`✅ Loaded ${farmerCropCount} farmer crops`);
  } catch (error) {
    console.error('❌ Error loading crops:', error);
  }
}

function createCropCard(crop) {
  const card = document.createElement('div');
  card.className = 'crop-card';
  card.dataset.cropId = crop.id;

  card.innerHTML = `
    <img src="${crop.imageUrl || 'https://via.placeholder.com/300x200/90EE90/228B22?text=No+Image'}" 
         alt="${crop.cropName}" class="crop-image" 
         onerror="this.src='https://via.placeholder.com/300x200/90EE90/228B22?text=No+Image'">
    <div class="crop-details">
      <div class="crop-header">
        <h3 class="crop-name">${crop.cropName}</h3>
        <span class="status-badge">${crop.status}</span>
      </div>
      <div class="crop-info">
        <p><strong>Category:</strong> ${crop.category}</p>
        <p><strong>Quantity:</strong> ${crop.quantity} kg</p>
        <p><strong>Price:</strong> ₹${crop.price}/kg</p>
        <p><strong>Harvest:</strong> ${crop.harvestDate ? new Date(crop.harvestDate).toLocaleDateString() : 'N/A'}</p>
        ${crop.description ? `<p style="color: var(--text-light); font-style: italic;">${crop.description}</p>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn btn-warning btn-edit" onclick="editCrop('${crop.id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-danger btn-delete" onclick="deleteCrop('${crop.id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>
  `;

  return card;
}

window.deleteCrop = async function (cropId) {
  if (!confirm('Are you sure you want to delete this crop listing? This action cannot be undone.')) {
    return;
  }

  try {
    console.log('🗑️ Deleting crop:', cropId);
    await deleteDoc(doc(db, 'crops', cropId));
    alert('✅ Crop deleted successfully!');
    await loadCrops();
  } catch (error) {
    console.error('❌ Delete error:', error);
    alert('❌ Failed to delete crop: ' + error.message);
  }
};

window.editCrop = function (cropId) {
  alert(`✏️ Edit functionality for crop ${cropId} - Coming soon!`);
};

function updateStats(totalListings = 0) {
  const totalListingsEl = document.getElementById('totalListings');
  if (totalListingsEl) {
    totalListingsEl.textContent = totalListings;
  }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      console.log('✅ Logged out successfully');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('❌ Logout error:', error);
      alert('Logout failed: ' + error.message);
    }
  });
}
