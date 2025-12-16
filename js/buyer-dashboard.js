import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let allCrops = [];
let buyerData = null;

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

    if (userData.userType !== 'buyer') {
      console.log('🚫 Access denied: Not a buyer!');
      alert('⛔ Access Denied: This page is for buyers only!');

      if (userData.userType === 'farmer') {
        window.location.href = 'farmer-dashboard.html';
      } else if (userData.userType === 'admin' || userData.isAdmin) {
        window.location.href = 'admin-dashboard.html';
      } else {
        await signOut(auth);
        window.location.href = 'login.html';
      }
      return;
    }

    console.log('✅ Buyer access granted');
    buyerData = userData;
    await loadUserData();
    await loadAllCrops();

  } catch (error) {
    console.error('❌ Auth check error:', error);
    alert('Error verifying access. Please login again.');
    await signOut(auth);
    window.location.href = 'login.html';
  }
});

async function loadUserData() {
  try {
    if (buyerData) {
      const userName = buyerData.businessName || buyerData.fullName || buyerData.contactPerson || 'Buyer';
      const userNameEl = document.getElementById('userName');
      if (userNameEl) {
        userNameEl.textContent = `Welcome, ${userName}`;
      }
      console.log('✅ User data loaded:', userName);
    } else {
      console.log('⚠️ No buyer data available');
    }
  } catch (error) {
    console.error('❌ Error loading user data:', error);
  }
}

async function loadAllCrops() {
  try {
    console.log('🔄 Loading crops from Firestore...');
    const cropsRef = collection(db, 'crops');

    const q = query(cropsRef, where('status', '==', 'available'));
    const querySnapshot = await getDocs(q);

    allCrops = [];

    for (const cropDoc of querySnapshot.docs) {
      const cropData = cropDoc.data();

      let farmerInfo = {
        name: 'Unknown Farmer',
        location: 'Location not available',
        state: '',
        district: '',
        phone: ''
      };

      if (cropData.farmerId) {
        try {
          const farmerDoc = await getDoc(doc(db, 'users', cropData.farmerId));
          if (farmerDoc.exists()) {
            const farmerData = farmerDoc.data();
            farmerInfo = {
              name: farmerData.fullName || 'Unknown Farmer',
              location: farmerData.state || farmerData.district || 'Location not available',
              state: farmerData.state || '',
              district: farmerData.district || '',
              phone: farmerData.phone || ''
            };
          }
        } catch (error) {
          console.log('⚠️ Could not fetch farmer details:', error);
        }
      }

      console.log('✅ Loaded crop:', cropData.cropName, '| Farmer:', farmerInfo.name, '| Location:', farmerInfo.state || farmerInfo.district);

      allCrops.push({
        id: cropDoc.id,
        ...cropData,
        farmerInfo: farmerInfo
      });
    }

    allCrops.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    console.log('✅ Total crops loaded:', allCrops.length);

    displayRecommendedCrops();
    displayCrops(allCrops);
    updateCropCount(allCrops.length);
  } catch (error) {
    console.error('❌ Error loading crops:', error);
    const container = document.getElementById('cropsContainer');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading crops. Please refresh the page.</p>
        </div>
      `;
    }
  }
}

function displayRecommendedCrops() {
  const container = document.getElementById('recommendedCrops');
  if (!container) return;

  if (!buyerData || !buyerData.interestedCrops || allCrops.length === 0) {
    container.innerHTML = '<p style="color: #7f8c8d; padding: 2rem; text-align: center;">Browse all crops below.</p>';
    return;
  }

  const recommended = allCrops.filter(crop => {
    return buyerData.interestedCrops.some(interest =>
      crop.cropName.toLowerCase().includes(interest.toLowerCase()) ||
      interest.toLowerCase().includes(crop.cropName.toLowerCase())
    );
  }).slice(0, 4);

  if (recommended.length === 0) {
    container.innerHTML = '<p style="color: #7f8c8d;">No recommendations yet. Browse all crops below.</p>';
    return;
  }

  container.innerHTML = recommended.map(crop => createCropCard(crop, true)).join('');
  console.log('✅ Recommended crops displayed:', recommended.length);
}

function displayCrops(crops) {
  const container = document.getElementById('cropsContainer');
  if (!container) {
    console.error('❌ cropsContainer not found');
    return;
  }

  if (crops.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-box-open" style="font-size: 4rem; color: #ddd; margin-bottom: 1rem;"></i>
        <p>No crops found matching your filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = crops.map(crop => createCropCard(crop, false)).join('');
  console.log('✅ Crops displayed:', crops.length);
}

function createCropCard(crop, isRecommended) {
  const farmerName = crop.farmerInfo?.name || 'Unknown Farmer';
  const farmerState = crop.farmerInfo?.state || '';
  const farmerDistrict = crop.farmerInfo?.district || '';

  const fullLocation = farmerDistrict && farmerState
    ? `${farmerDistrict}, ${farmerState}`
    : farmerState || farmerDistrict || 'Location not available';

  return `
    <div class="crop-card" style="position: relative;">
      ${isRecommended ? '<div style="position: absolute; top: 10px; right: 10px; background: #f39c12; color: white; padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; font-weight: bold; z-index: 10;"><i class="fas fa-star"></i> Recommended</div>' : ''}
      
      <img src="${crop.imageUrl || 'https://via.placeholder.com/300x200/90EE90/228B22?text=No+Image'}" 
           alt="${crop.cropName}" 
           class="crop-image" 
           onerror="this.src='https://via.placeholder.com/300x200/90EE90/228B22?text=No+Image'">
      
      <div class="crop-details">
        <div class="crop-header">
          <h3 class="crop-name">${crop.cropName || 'Unnamed Crop'}</h3>
          <span class="crop-status status-available">${crop.status || 'available'}</span>
        </div>
        
        <!-- ⭐ FARMER INFO SECTION -->
        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--primary-color);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <i class="fas fa-user" style="color: var(--primary-color);"></i>
            <span style="font-weight: 600; color: var(--text-dark);">${farmerName}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
            <span style="color: var(--text-light); font-size: 0.9rem;">${fullLocation}</span>
          </div>
        </div>
        
        <div class="crop-info">
          <div class="info-row">
            <span class="info-label"><i class="fas fa-tag"></i> Category:</span>
            <span class="info-value">${crop.category || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label"><i class="fas fa-weight"></i> Quantity:</span>
            <span class="info-value">${crop.quantity || 0} kg</span>
          </div>
          <div class="info-row">
            <span class="info-label"><i class="fas fa-star"></i> Quality:</span>
            <span class="info-value">${crop.quality || 'Standard'}</span>
          </div>
          <div class="info-row">
            <span class="info-label"><i class="fas fa-calendar"></i> Harvest:</span>
            <span class="info-value">${crop.harvestDate ? new Date(crop.harvestDate).toLocaleDateString('en-IN') : 'N/A'}</span>
          </div>
        </div>
        
        <div class="price-tag">₹${crop.price || 0}/kg</div>
        
        ${crop.description ? `<p style="color: #7f8c8d; font-size: 0.9rem; margin: 1rem 0; line-height: 1.4;"><i class="fas fa-info-circle"></i> ${crop.description}</p>` : ''}
        
        <button class="btn btn-primary btn-full" onclick="showContactModal('${crop.id}')" style="margin-top: 1rem;">
          <i class="fas fa-phone"></i> Contact Farmer
        </button>
      </div>
    </div>
  `;
}


window.showContactModal = function (cropId) {
  const crop = allCrops.find(c => c.id === cropId);
  if (!crop) {
    alert('Crop not found');
    return;
  }

  const modal = document.getElementById('contactModal');
  const farmerDetails = document.getElementById('farmerDetails');

  if (!modal || !farmerDetails) return;

  const farmerName = crop.farmerInfo?.name || 'Unknown Farmer';
  const farmerState = crop.farmerInfo?.state || '';
  const farmerDistrict = crop.farmerInfo?.district || '';
  const farmerPhone = crop.farmerInfo?.phone || 'Not available';

  const fullLocation = farmerDistrict && farmerState
    ? `${farmerDistrict}, ${farmerState}`
    : farmerState || farmerDistrict || 'Location not available';

  farmerDetails.innerHTML = `
    <div class="detail-item">
      <i class="fas fa-seedling" style="font-size: 2rem; color: var(--primary-color);"></i>
      <div class="detail-info">
        <h4>Crop Details</h4>
        <p style="font-size: 1.2rem; font-weight: 600; color: var(--primary-color);">${crop.cropName}</p>
        <p style="font-size: 1.1rem; margin-top: 5px;">${crop.quantity} kg @ ₹${crop.price}/kg</p>
        <p style="color: var(--text-light); margin-top: 5px;">${crop.quality || 'Standard'} - ${crop.category || 'N/A'}</p>
      </div>
    </div>
    
    <div class="detail-item">
      <i class="fas fa-user-tie" style="font-size: 1.8rem; color: var(--primary-color);"></i>
      <div class="detail-info">
        <h4>Farmer Name</h4>
        <p style="font-size: 1.1rem; font-weight: 600;">${farmerName}</p>
      </div>
    </div>
    
    <div class="detail-item">
      <i class="fas fa-map-marker-alt" style="font-size: 1.8rem; color: var(--primary-color);"></i>
      <div class="detail-info">
        <h4>Farmer Location</h4>
        <p style="font-size: 1.1rem;">${fullLocation}</p>
      </div>
    </div>
    
    <div class="detail-item">
      <i class="fas fa-phone" style="font-size: 1.5rem; color: var(--primary-color);"></i>
      <div class="detail-info">
        <h4>Contact Number</h4>
        <p style="font-size: 1.2rem; font-weight: 600; color: var(--primary-color);">${farmerPhone}</p>
        ${farmerPhone !== 'Not available' ? `<a href="tel:${farmerPhone}" class="btn btn-primary" style="margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none;"><i class="fas fa-phone"></i> Call Now</a>` : ''}
      </div>
    </div>
    
    <div class="detail-item">
      <i class="fas fa-calendar-alt" style="font-size: 1.5rem; color: var(--primary-color);"></i>
      <div class="detail-info">
        <h4>Harvest Date</h4>
        <p style="font-size: 1rem;">${crop.harvestDate ? new Date(crop.harvestDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'}</p>
      </div>
    </div>
    
    ${crop.description ? `
    <div class="detail-item">
      <i class="fas fa-info-circle" style="font-size: 1.5rem; color: var(--primary-color);"></i>
      <div class="detail-info">
        <h4>Description</h4>
        <p style="line-height: 1.6; color: var(--text-dark);">${crop.description}</p>
      </div>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin-top: 2rem; padding: 1.5rem; background: var(--bg-light); border-radius: var(--radius-md);">
      <button class="btn btn-secondary btn-full" onclick="closeContactModal()">
        <i class="fas fa-times"></i> Close
      </button>
    </div>
  `;

  modal.style.display = 'block';
};

window.closeContactModal = function () {
  const modal = document.getElementById('contactModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => {

  const closeModal = document.querySelector('.close-modal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      window.closeContactModal();
    });
  }

  const modal = document.getElementById('contactModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        window.closeContactModal();
      }
    });
  }

  const searchInput = document.getElementById('searchInput');
  const filterCategory = document.getElementById('filterCategory');
  const filterLocation = document.getElementById('filterLocation');
  const filterQuality = document.getElementById('filterQuality');
  const sortBy = document.getElementById('sortBy');

  if (searchInput) searchInput.addEventListener('input', filterCrops);
  if (filterCategory) filterCategory.addEventListener('change', filterCrops);
  if (filterLocation) filterLocation.addEventListener('change', filterCrops);
  if (filterQuality) filterQuality.addEventListener('change', filterCrops);
  if (sortBy) sortBy.addEventListener('change', filterCrops);

  console.log('✅ Filter listeners attached');
});

function filterCrops() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const category = document.getElementById('filterCategory')?.value || '';
  const location = document.getElementById('filterLocation')?.value || '';
  const quality = document.getElementById('filterQuality')?.value || '';
  const sortBy = document.getElementById('sortBy')?.value || 'newest';

  console.log('🔍 Filters Applied:', { searchTerm, category, location, quality, sortBy });

  let filtered = allCrops.filter(crop => {

    const matchSearch = !searchTerm ||
      crop.cropName?.toLowerCase().includes(searchTerm) ||
      crop.category?.toLowerCase().includes(searchTerm) ||
      crop.description?.toLowerCase().includes(searchTerm) ||
      crop.farmerInfo?.name?.toLowerCase().includes(searchTerm);


    const matchCategory = !category || crop.category === category;


    const matchQuality = !quality || crop.quality === quality;


    const matchLocation = !location ||
      crop.farmerInfo?.state === location ||
      crop.farmerInfo?.district === location;

    const matches = matchSearch && matchCategory && matchQuality && matchLocation;

    if (location && matches) {
      console.log('✅ Matched crop:', crop.cropName, '| Farmer:', crop.farmerInfo?.name, '| Location:', crop.farmerInfo?.state);
    }

    return matches;
  });

  console.log('✅ Filtered crops:', filtered.length, '/', allCrops.length);


  switch (sortBy) {
    case 'price-low':
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price-high':
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'quantity':
      filtered.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      break;
    default:
      filtered.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
  }

  displayCrops(filtered);
  updateCropCount(filtered.length);
}

function updateCropCount(count) {
  const countEl = document.getElementById('cropCount');
  if (countEl) countEl.textContent = `${count} crops found`;
}


const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await signOut(auth);
        console.log('✅ Logged out successfully');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('❌ Logout error:', error);
        alert('Logout failed: ' + error.message);
      }
    }
  });
}

console.log('✅ Buyer dashboard script loaded');
