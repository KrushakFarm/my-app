const API_URL = "http://localhost:5000/api";
let currentUser = null;
let authToken = null;

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  checkFarmerAuth();
  initSidebarNav();
  setupFormHandler();
});

// ================= AUTH CHECK =================
async function checkFarmerAuth() {
  authToken = localStorage.getItem('authToken');
  
  if (!authToken) {
    redirectToLogin();
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    
    if (res.ok && data.success) {
      currentUser = data.user;
      
      // Check if user is a farmer
      if (currentUser.role !== 'farmer') {
        alert('Access denied. Only farmers can access this dashboard.');
        window.location.href = 'index.html';
        return;
      }
      
      // Load dashboard data
      loadProducts();
      updateMetrics();
    } else {
      redirectToLogin();
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    redirectToLogin();
  }
}

function redirectToLogin() {
  localStorage.removeItem('authToken');
  alert('Please login as a farmer to access the dashboard.');
  window.location.href = 'seller-login.html';
}

// ================= SIDEBAR NAVIGATION =================
function initSidebarNav() {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll("main section");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      // Remove active class from all items
      navItems.forEach(i => i.classList.remove("active"));
      // Hide all sections
      sections.forEach(s => s.classList.add("hidden"));

      // Add active class to clicked item
      item.classList.add("active");
      
      const target = item.getAttribute("data-target");
      if (target) {
        const targetSection = document.getElementById(target);
        if (targetSection) {
          targetSection.classList.remove("hidden");
        }
      }

      // Handle specific actions
      if (target === "products-section") {
        loadProducts();
      } else if (target === "orders-section") {
        loadOrders();
      }
    });
  });
}

// ================= FORM HANDLER =================
function setupFormHandler() {
  const form = document.getElementById("product-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    try {
      // Get form data
      const name = document.getElementById("product-name").value.trim();
      const price = parseFloat(document.getElementById("product-price").value);
      const quantity = parseInt(document.getElementById("product-quantity").value);
      const unit = document.getElementById("product-unit").value;
      const category = document.getElementById("product-category").value;
      const imageFile = document.getElementById("product-image").files[0];

      // Validation
      if (!name || !price || !quantity || !unit || !category || !imageFile) {
        throw new Error("Please fill all fields and select an image.");
      }

      // Convert image to base64
      const base64Image = await fileToBase64(imageFile);

      // Prepare payload
      const payload = {
        name,
        price,
        quantity,
        unit,
        category,
        image: base64Image
      };

      // Submit to backend
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add product");
      }

      // Success
      showPopupMessage("Product added successfully!");
      form.reset();
      loadProducts();
      updateMetrics();

    } catch (error) {
      console.error("Error adding product:", error);
      showPopupMessage("Error: " + error.message, "error");
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ================= PRODUCT MANAGEMENT =================
async function loadProducts() {
  const productList = document.getElementById("product-list");
  if (!productList) return;

  try {
    const res = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) throw new Error("Failed to fetch products");
    
    const allProducts = await res.json();
    
    // Filter products by current farmer
    const farmerProducts = allProducts.filter(p => 
      p.farmerId._id === currentUser.id || p.farmerId === currentUser.id
    );

    renderFarmerProducts(farmerProducts);
    updateProductsMetric(farmerProducts.length);

  } catch (error) {
    console.error("Error loading products:", error);
    productList.innerHTML = "<p>Error loading products. Please try again.</p>";
  }
}

function renderFarmerProducts(products) {
  const productList = document.getElementById("product-list");
  if (!productList) return;

  productList.innerHTML = "";

  if (!products || products.length === 0) {
    productList.innerHTML = "<p>No products listed yet. Add your first product!</p>";
    return;
  }

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img src="${product.image}" alt="${escapeHtml(product.name)}" 
           onerror="this.src='images/placeholder.png'">
      <h4>${escapeHtml(product.name)}</h4>
      <p>₹${product.price} per ${escapeHtml(product.unit)}</p>
      <p>Stock: ${product.quantity} ${escapeHtml(product.unit)}</p>
      <p>Category: ${escapeHtml(product.category)}</p>
      <button class="remove-btn" onclick="removeProduct('${product._id}')">
        Remove
      </button>
    `;

    productList.appendChild(card);
  });
}

async function removeProduct(productId) {
  if (!confirm("Are you sure you want to remove this product?")) return;

  try {
    const res = await fetch(`${API_URL}/products/${productId}`, {
      method: "DELETE",
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete product");
    }

    showPopupMessage("Product removed successfully!");
    loadProducts();
    updateMetrics();

  } catch (error) {
    console.error("Error deleting product:", error);
    showPopupMessage("Error: " + error.message, "error");
  }
}

// ================= ORDERS MANAGEMENT =================
async function loadOrders() {
  // This would require additional backend implementation
  // For now, show placeholder
  console.log("Orders loading - to be implemented");
}

// ================= METRICS =================
async function updateMetrics() {
  try {
    const res = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) throw new Error("Failed to fetch products for metrics");
    
    const allProducts = await res.json();
    const farmerProducts = allProducts.filter(p => 
      p.farmerId._id === currentUser.id || p.farmerId === currentUser.id
    );

    // Update metrics
    updateProductsMetric(farmerProducts.length);
    
    // Calculate total value of inventory
    const totalValue = farmerProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    updateInventoryValueMetric(totalValue);

  } catch (error) {
    console.error("Error updating metrics:", error);
  }
}

function updateProductsMetric(count) {
  const metrics = document.querySelectorAll(".metric-card");
  if (metrics && metrics.length >= 3) {
    const productMetric = metrics[2].querySelector('p');
    if (productMetric) {
      productMetric.textContent = count;
    }
  }
}

function updateInventoryValueMetric(value) {
  const metrics = document.querySelectorAll(".metric-card");
  if (metrics && metrics.length >= 1) {
    const valueMetric = metrics[0].querySelector('p');
    if (valueMetric) {
      valueMetric.textContent = `₹${value.toFixed(2)}`;
    }
  }
}

// ================= UTILITIES =================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showPopupMessage(message, type = "success") {
  const popup = document.getElementById("popupMessage");
  const text = document.getElementById("popupText");
  
  if (!popup || !text) {
    // Fallback to alert if popup elements not found
    alert(message);
    return;
  }

  text.textContent = message;
  
  // Style based on type
  if (type === "error") {
    popup.style.backgroundColor = "#e74c3c";
  } else {
    popup.style.backgroundColor = "#4BB543";
  }
  
  popup.classList.add("visible");

  setTimeout(() => {
    popup.classList.remove("visible");
  }, 3000);
}

// ================= LOGOUT =================
async function logout() {
  try {
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  // Clear all authentication data
  localStorage.removeItem('authToken');
  localStorage.removeItem('farmerAuthToken');
  localStorage.removeItem('farmerUser');
  
  // Show success message
  showPopupMessage('Logged out successfully');
  
  // Redirect to home page
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 280);
}
