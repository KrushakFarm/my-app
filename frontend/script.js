const API_URL = "http://localhost:5000/api";
let currentUser = null;
let authToken = null;

// ===================== PAGE INIT =====================
window.addEventListener("DOMContentLoaded", () => {
  checkAuthOnLoad();
  updateCartCount();
  loadBestSellers();
  setupEventListeners();
});

// ===================== AUTH =====================
async function checkAuthOnLoad() {
  authToken = localStorage.getItem('authToken');
  if (authToken) {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      
      if (res.ok && data.success && data.user.role === 'customer') {
        currentUser = data.user;
      } else if (res.status === 401) {
        // Token expired - clear it silently
        console.log("Auth token expired, clearing...");
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
      }
    } catch (err) {
      // Network error - keep token, might work later
      console.error("Auth check failed (network):", err);
    }
  }
  updateAuthButtons();
}

// Update header buttons (show login or profile)
function updateAuthButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const profileMenu = document.getElementById("profileMenu");
  const dropdownMenu = document.getElementById("dropdownMenu");

  if (currentUser && loginBtn && profileMenu && dropdownMenu) {
    loginBtn.classList.add("hidden");
    profileMenu.classList.remove("hidden");
    
    // Update profile dropdown content
    dropdownMenu.innerHTML = `
      <div style="padding:8px 12px; border-bottom: 1px solid #eee;">
        <strong>${currentUser.name}</strong>
        <br><small>${currentUser.email}</small>
      </div>
      <a href="my-orders.html">My Orders</a>
      <a href="#" onclick="logoutUser()">Logout</a>
    `;

    // Add click handler to profile icon
    const profileIcon = profileMenu.querySelector('.profile-icon');
    if (profileIcon) {
      profileIcon.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("hidden");
      };
    }

    // Close dropdown when clicking outside
    document.onclick = (e) => {
      if (!profileMenu.contains(e.target)) {
        dropdownMenu.classList.add("hidden");
      }
    };
  } else if (loginBtn && profileMenu) {
    loginBtn.classList.remove("hidden");
    profileMenu.classList.add("hidden");
  }
}

// Setup event listeners
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Signup form
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }

  // Login button
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => toggleAuthModal(true));
  }

  // Close modal
  const closeModal = document.getElementById("closeModal");
  if (closeModal) {
    closeModal.onclick = () => toggleAuthModal(false);
  }

  // Switch between forms
  const showSignup = document.getElementById("showSignup");
  const showLogin = document.getElementById("showLogin");
  
  if (showSignup) {
    showSignup.onclick = (e) => {
      e.preventDefault();
      switchToSignup();
    };
  }
  
  if (showLogin) {
    showLogin.onclick = (e) => {
      e.preventDefault();
      switchToLogin();
    };
  }

  // Category buttons
  const categoryButtons = document.querySelectorAll('.category-button');
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.getAttribute('data-target') || button.textContent.trim();
      loadProductsByCategory(category);
    });
  });
}

// LOGIN form submit
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  // Clear any existing error messages
  const errorEl = document.getElementById("loginError");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();

    if (res.ok && data.success) {
      // CHECK: Only allow customers to login from consumer interface
      if (data.user.role !== 'customer') {
        const errorMessage = data.user.role === 'farmer' 
          ? "Farmers should login from the Farmer Dashboard. Please use the farmer login page."
          : "Invalid user role for consumer login.";
        
        if (errorEl) {
          errorEl.textContent = errorMessage;
          errorEl.classList.remove("hidden");
        } else {
          alert(errorMessage);
        }
        return;
      }
      // Store auth token
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      currentUser = data.user;
      
      toggleAuthModal(false);
      showPopupMessage("Welcome back, " + data.user.name + "!");
      updateAuthButtons();
      updateCartCount();
    } else {
      if (errorEl) {
        errorEl.textContent = data.message || "Invalid email or password.";
        errorEl.classList.remove("hidden");
      } else {
        alert(data.message || "Invalid email or password.");
      }
    }
  } catch (err) {
    console.error("Login error:", err);
    const message = "Server error. Please try again later.";
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    } else {
      alert(message);
    }
  }
}

// REGISTER form submit
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  // Determine role (you might want to add a role selector in your form)
  const role = 'customer'; // Default to customer, or add UI element for role selection

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      // Store auth token
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      currentUser = data.user;
      
      toggleAuthModal(false);
      showPopupMessage("Welcome! Account created successfully.");
      updateAuthButtons();
      updateCartCount();
    } else {
      alert(data.message || "Signup failed");
    }
  } catch (err) {
    console.error("Signup error:", err);
    alert("Server error. Try again later.");
  }
}

// Logout
async function logoutUser() {
  try {
    if (authToken) {
      await fetch(`${API_URL}/auth/logout`, { 
        method: "POST",
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
  } catch (e) {
    console.error("Logout error:", e);
  }
  
  // Clear local data
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  updateAuthButtons();
  showPopupMessage("Logged out successfully");
  
  // Redirect to home if on protected pages
  if (window.location.pathname.includes('seller-dashboard') || 
      window.location.pathname.includes('my-orders')) {
    window.location.href = 'index.html';
  }
}

// ===================== CART =====================
async function updateCartCount() {
  const cartCountEl = document.getElementById("cart-count") || document.querySelector(".cart-count");
  
  if (!authToken) {
    if (cartCountEl) cartCountEl.textContent = "0";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/cart`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) {
      if (cartCountEl) cartCountEl.textContent = "0";
      return;
    }
    
    const cartItems = await res.json();
    const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (cartCountEl) cartCountEl.textContent = String(totalItems);
  } catch (err) {
    console.error("Cart count failed", err);
    if (cartCountEl) cartCountEl.textContent = "0";
  }
}

async function addToCart(productId) {
  if (!authToken) {
    toggleAuthModal(true);
    return false;
  }

  try {
    const res = await fetch(`${API_URL}/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ productId })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      showPopupMessage("Added to cart!");
      updateCartCount();
      return true;
    } else {
      if (res.status === 401) {
        toggleAuthModal(true);
      }
      alert(data.message || "Could not add to cart");
      return false;
    }
  } catch (err) {
    console.error("Add to cart error:", err);
    alert("Server error. Try again later.");
    return false;
  }
}

// ===================== PRODUCTS =====================
async function loadBestSellers() {
  try {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error("Failed to fetch products");
    
    const products = await res.json();
    
    // Take first 4 products as best sellers
    const bestSellers = products.slice(0, 4);
    renderProducts(bestSellers, document.getElementById("product-container"));
  } catch (err) {
    console.error("Error loading best sellers:", err);
  }
}

async function loadProductsByCategory(category) {
  try {
    const res = await fetch(`${API_URL}/products?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error("Failed to fetch products");
    
    const products = await res.json();
    
    const container = document.getElementById("main-content");
    if (container) {
      container.innerHTML = `
        <section class="products">
          <h2>${category}</h2>
          <div class="product-grid">
            ${products.length ? 
              products.map(p => createProductCardHTML(p)).join('') : 
              '<p>No products found in this category</p>'
            }
          </div>
        </section>
      `;
    }
  } catch (err) {
    console.error("Error loading products by category:", err);
  }
}

function renderProducts(products, container) {
  if (!container) return;
  
  container.innerHTML = products.map(p => createProductCardHTML(p)).join('');
  
  // Attach event listeners to add-to-cart buttons
  container.querySelectorAll('[data-product-id]').forEach(button => {
    button.addEventListener('click', () => {
      addToCart(button.getAttribute('data-product-id'));
    });
  });
}

function createProductCardHTML(product) {
  return `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}" onerror="this.src='images/placeholder.png'">
      <h3>${product.name}</h3>
      <p>₹${product.price}</p>
      <p>${product.quantity} ${product.unit} available</p>
      <button data-product-id="${product._id}">Add to Cart</button>
    </div>
  `;
}

// ===================== UI HELPERS =====================
function showPopupMessage(message) {
  const popup = document.getElementById("popupMessage");
  const text = document.getElementById("popupText");
  if (!popup || !text) return;

  text.textContent = message;
  popup.classList.add("visible");

  setTimeout(() => {
    popup.classList.remove("visible");
  }, 3000);
}

// Toggle modal
function toggleAuthModal(show = true) {
  const authModal = document.getElementById("authModal");
  if (!authModal) return;
  
  if (show) {
    authModal.classList.remove("hidden");
  } else {
    authModal.classList.add("hidden");
  }
}

// Switch to signup form
function switchToSignup() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const modalTitle = document.getElementById("modalTitle");
  
  if (loginForm) loginForm.classList.add("hidden");
  if (signupForm) signupForm.classList.remove("hidden");
  if (modalTitle) modalTitle.innerText = "Sign Up";
}

// Switch to login form
function switchToLogin() {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");
  const modalTitle = document.getElementById("modalTitle");
  
  if (signupForm) signupForm.classList.add("hidden");
  if (loginForm) loginForm.classList.remove("hidden");
  if (modalTitle) modalTitle.innerText = "Login";
}

// Password toggle
function togglePassword(inputId, toggleEl) {
  const input = document.getElementById(inputId);
  if (!input || !toggleEl) return;
  
  if (input.type === "password") {
    input.type = "text";
    toggleEl.textContent = "🙈";
  } else {
    input.type = "password";
    toggleEl.textContent = "👁️";
  }
}

// Password strength
function checkStrength(password) {
  const strengthText = document.getElementById("passwordStrength");
  if (!strengthText) return;
  
  if (password.length < 6) {
    strengthText.textContent = "Weak (min 6 chars)";
    strengthText.style.color = "red";
  } else if (
    password.match(/[A-Z]/) &&
    password.match(/[0-9]/) &&
    password.length >= 8
  ) {
    strengthText.textContent = "Strong password ✓";
    strengthText.style.color = "green";
  } else {
    strengthText.textContent = "Medium strength";
    strengthText.style.color = "orange";
  }
}

let allProducts = [];
let searchTimeout;
let searchSuggestions = [];

// Initialize search functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSearch();
    loadAllProducts();
});

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.querySelector('input[placeholder="Search products"]');
    
    if (!searchInput) return;
    
    // Create search suggestions container
    createSearchSuggestionsContainer(searchInput);
    
    // Add event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('focus', handleSearchFocus);
    searchInput.addEventListener('blur', handleSearchBlur);
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchSuggestions();
        }
    });
}

// Create search suggestions container
function createSearchSuggestionsContainer(searchInput) {
    // Wrap search input in container if not already wrapped
    if (!searchInput.parentElement.classList.contains('search-container')) {
        const container = document.createElement('div');
        container.className = 'search-container';
        container.style.cssText = 'position: relative; display: inline-block;';
        
        searchInput.parentNode.insertBefore(container, searchInput);
        container.appendChild(searchInput);
    }
    
    // Create suggestions dropdown
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'searchSuggestions';
    suggestionsContainer.className = 'search-suggestions';
    suggestionsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 8px 8px;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    searchInput.parentElement.appendChild(suggestionsContainer);
    
    // Add clear button
    const clearButton = document.createElement('button');
    clearButton.innerHTML = '×';
    clearButton.className = 'clear-search';
    clearButton.style.cssText = `
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-size: 18px;
        color: #999;
        cursor: pointer;
        padding: 4px;
        display: none;
    `;
    clearButton.onclick = clearSearch;
    searchInput.parentElement.appendChild(clearButton);
    
    // Style the search input
    searchInput.style.paddingRight = '30px';
}

// Handle search input
function handleSearchInput(e) {
    const query = e.target.value.trim();
    const clearButton = e.target.parentElement.querySelector('.clear-search');
    
    // Show/hide clear button
    if (clearButton) {
        clearButton.style.display = query ? 'block' : 'none';
    }
    
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    if (query.length === 0) {
        hideSearchSuggestions();
        showDefaultContent();
        return;
    }
    
    // Debounce search (wait 300ms after user stops typing)
    searchTimeout = setTimeout(() => {
        if (query.length >= 2) {
            performSearch(query);
            generateSearchSuggestions(query);
        }
    }, 300);
}

// Handle keyboard navigation
function handleSearchKeydown(e) {
    const suggestions = document.querySelectorAll('.suggestion-item');
    let currentIndex = Array.from(suggestions).findIndex(item => item.classList.contains('highlighted'));
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (currentIndex < suggestions.length - 1) {
                if (currentIndex >= 0) suggestions[currentIndex].classList.remove('highlighted');
                suggestions[currentIndex + 1].classList.add('highlighted');
            }
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            if (currentIndex > 0) {
                suggestions[currentIndex].classList.remove('highlighted');
                suggestions[currentIndex - 1].classList.add('highlighted');
            }
            break;
            
        case 'Enter':
            e.preventDefault();
            if (currentIndex >= 0) {
                suggestions[currentIndex].click();
            } else {
                const query = e.target.value.trim();
                if (query) {
                    performSearch(query);
                    hideSearchSuggestions();
                }
            }
            break;
            
        case 'Escape':
            hideSearchSuggestions();
            e.target.blur();
            break;
    }
}

// Handle search focus
function handleSearchFocus(e) {
    const query = e.target.value.trim();
    if (query && query.length >= 2) {
        generateSearchSuggestions(query);
    }
}

// Handle search blur (with delay to allow clicks on suggestions)
function handleSearchBlur(e) {
    setTimeout(() => {
        hideSearchSuggestions();
    }, 150);
}

// Load all products for search
async function loadAllProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
            allProducts = await response.json();
        }
    } catch (error) {
        console.error('Error loading products for search:', error);
    }
}

// Perform search
async function performSearch(query) {
    try {
        // If products not loaded yet, load them
        if (allProducts.length === 0) {
            await loadAllProducts();
        }
        
        const filteredProducts = allProducts.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(query.toLowerCase())) ||
            (product.farmerId && product.farmerId.name && 
             product.farmerId.name.toLowerCase().includes(query.toLowerCase()))
        );
        
        displaySearchResults(filteredProducts, query);
        
    } catch (error) {
        console.error('Search error:', error);
        showPopupMessage('Search failed. Please try again.');
    }
}

// Generate search suggestions
function generateSearchSuggestions(query) {
    if (allProducts.length === 0) return;
    
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // Product name suggestions
    const productSuggestions = allProducts
        .filter(product => 
            product.name.toLowerCase().includes(queryLower)
        )
        .slice(0, 4)
        .map(product => ({
            type: 'product',
            text: product.name,
            category: product.category,
            price: product.price
        }));
    
    // Category suggestions
    const categories = [...new Set(allProducts.map(p => p.category))];
    const categorySuggestions = categories
        .filter(cat => cat.toLowerCase().includes(queryLower))
        .slice(0, 2)
        .map(cat => ({
            type: 'category',
            text: cat,
            count: allProducts.filter(p => p.category === cat).length
        }));
    
    // Farmer suggestions
    const farmers = [...new Set(allProducts
        .filter(p => p.farmerId && p.farmerId.name)
        .map(p => p.farmerId.name))];
    const farmerSuggestions = farmers
        .filter(farmer => farmer.toLowerCase().includes(queryLower))
        .slice(0, 2)
        .map(farmer => ({
            type: 'farmer',
            text: farmer,
            count: allProducts.filter(p => p.farmerId && p.farmerId.name === farmer).length
        }));
    
    suggestions.push(...productSuggestions, ...categorySuggestions, ...farmerSuggestions);
    
    if (suggestions.length > 0) {
        displaySearchSuggestions(suggestions, query);
    } else {
        hideSearchSuggestions();
    }
}

// Display search suggestions
function displaySearchSuggestions(suggestions, query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;
    
    let html = '';
    
    suggestions.forEach((suggestion, index) => {
        const highlightedText = highlightQuery(suggestion.text, query);
        
        switch (suggestion.type) {
            case 'product':
                html += `
                    <div class="suggestion-item" onclick="selectSuggestion('${suggestion.text}', 'product')" 
                         style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;"
                         onmouseover="this.style.background='#f8f9fa'"
                         onmouseout="this.style.background='white'">
                        <div>
                            <div style="font-weight: 500;">${highlightedText}</div>
                            <div style="font-size: 12px; color: #666;">${suggestion.category}</div>
                        </div>
                        <div style="font-weight: 600; color: #2d7a2d;">₹${suggestion.price}</div>
                    </div>
                `;
                break;
                
            case 'category':
                html += `
                    <div class="suggestion-item" onclick="selectSuggestion('${suggestion.text}', 'category')"
                         style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;"
                         onmouseover="this.style.background='#f8f9fa'"
                         onmouseout="this.style.background='white'">
                        <div>
                            <span style="margin-right: 8px;">📂</span>
                            Browse ${highlightedText}
                        </div>
                        <span style="font-size: 12px; color: #666;">${suggestion.count} items</span>
                    </div>
                `;
                break;
                
            case 'farmer':
                html += `
                    <div class="suggestion-item" onclick="selectSuggestion('${suggestion.text}', 'farmer')"
                         style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;"
                         onmouseover="this.style.background='#f8f9fa'"
                         onmouseout="this.style.background='white'">
                        <div>
                            <span style="margin-right: 8px;">👨‍🌾</span>
                            Products by ${highlightedText}
                        </div>
                        <span style="font-size: 12px; color: #666;">${suggestion.count} items</span>
                    </div>
                `;
                break;
        }
    });
    
    // Add "View all results" option
    html += `
        <div class="suggestion-item" onclick="selectSuggestion('${query}', 'search')"
             style="padding: 12px; cursor: pointer; text-align: center; background: #f8f9fa; font-weight: 500; color: #2d7a2d;"
             onmouseover="this.style.background='#e9ecef'"
             onmouseout="this.style.background='#f8f9fa'">
            View all results for "${query}"
        </div>
    `;
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
}

// Highlight query in text
function highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background: #fff3cd; padding: 0 2px;">$1</mark>');
}

// Select suggestion
function selectSuggestion(text, type) {
    const searchInput = document.querySelector('input[placeholder="Search products"]');
    
    switch (type) {
        case 'product':
            searchInput.value = text;
            performSearch(text);
            break;
            
        case 'category':
            window.location.href = `category.html?category=${text}`;
            break;
            
        case 'farmer':
            searchInput.value = `farmer:${text}`;
            performSearchByFarmer(text);
            break;
            
        case 'search':
        default:
            searchInput.value = text;
            performSearch(text);
            break;
    }
    
    hideSearchSuggestions();
}

// Search by farmer
function performSearchByFarmer(farmerName) {
    const filteredProducts = allProducts.filter(product =>
        product.farmerId && product.farmerId.name === farmerName
    );
    displaySearchResults(filteredProducts, `Products by ${farmerName}`);
}

// Hide search suggestions
function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
    
    // Remove highlighting from all suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.classList.remove('highlighted');
    });
}

// Clear search
function clearSearch() {
    const searchInput = document.querySelector('input[placeholder="Search products"]');
    const clearButton = document.querySelector('.clear-search');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    if (clearButton) {
        clearButton.style.display = 'none';
    }
    
    hideSearchSuggestions();
    showDefaultContent();
}

// Display search results
function displaySearchResults(products, query) {
    // Hide default sections
    const heroSection = document.querySelector('.hero');
    const categoriesSection = document.querySelector('.categories');
    const bestSellersSection = document.querySelector('.best-sellers');
    
    if (heroSection) heroSection.style.display = 'none';
    if (categoriesSection) categoriesSection.style.display = 'none';
    if (bestSellersSection) bestSellersSection.style.display = 'none';
    
    // Create or update search results section
    let searchSection = document.getElementById('searchResultsSection');
    if (!searchSection) {
        searchSection = document.createElement('section');
        searchSection.id = 'searchResultsSection';
        searchSection.style.cssText = 'padding: 2rem; max-width: 1200px; margin: 0 auto;';
        document.getElementById('main-content').appendChild(searchSection);
    }
    
    const resultsHtml = `
        <div style="margin-bottom: 2rem;">
            <h2 style="font-size: 2rem; color: #333; margin-bottom: 0.5rem;">
                Search Results
            </h2>
            <p style="color: #666; font-size: 1rem;">
                Found ${products.length} result${products.length !== 1 ? 's' : ''} for "${query}"
            </p>
        </div>
        
        <div class="product-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
            ${products.length > 0 ? renderProductsHTML(products) : `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                    <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">No products found</h3>
                    <p>Try different keywords or <a href="#" onclick="showDefaultContent()" style="color: #2d7a2d;">browse our categories</a></p>
                </div>
            `}
        </div>
    `;
    
    searchSection.innerHTML = resultsHtml;
    searchSection.style.display = 'block';
    
    // Scroll to results
    searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render products HTML
function renderProductsHTML(products) {
    return products.map(product => `
        <div class="product-card" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.1); transition: all 0.4s ease; cursor: pointer;">
            <img src="${product.image || 'images/placeholder.png'}" 
                 alt="${product.name}" 
                 style="width: 100%; height: 200px; object-fit: cover;"
                 onerror="this.src='images/placeholder.png'">
            
            <div style="padding: 1.5rem;">
                <div style="background: linear-gradient(135deg, #2d7a2d, #4caf50); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600; display: inline-block; margin-bottom: 0.75rem;">
                    ${product.category}
                </div>
                
                <h3 style="font-size: 1.25rem; font-weight: 600; color: #333; margin-bottom: 0.5rem; line-height: 1.3;">
                    ${product.name}
                </h3>
                
                <div style="font-size: 1.5rem; font-weight: 700; color: #2d7a2d; margin-bottom: 0.5rem;">
                    ₹${product.price}
                </div>
                
                <div style="display: flex; justify-content: space-between; margin: 0.75rem 0; color: #666; font-size: 0.9rem;">
                    <span>Per ${product.unit}</span>
                    <span style="color: ${product.quantity > 0 ? '#4caf50' : '#f44336'}; font-weight: 600;">
                        ${product.quantity > 0 ? `${product.quantity} ${product.unit} available` : 'Out of stock'}
                    </span>
                </div>
                
                ${product.farmerId && product.farmerId.name ? `
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #eee; font-size: 0.85rem; color: #666;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: #2d7a2d; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.7rem;">
                            ${product.farmerId.name.charAt(0).toUpperCase()}
                        </div>
                        <span>By ${product.farmerId.name}</span>
                    </div>
                ` : ''}
                
                <button onclick="addToCart('${product._id}')" 
                        style="width: 100%; padding: 1rem; background: ${product.quantity > 0 ? 'linear-gradient(135deg, #2d7a2d, #4caf50)' : '#ccc'}; color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 1rem; cursor: ${product.quantity > 0 ? 'pointer' : 'not-allowed'}; transition: all 0.3s ease; margin-top: 1rem;"
                        ${product.quantity <= 0 ? 'disabled' : ''}>
                    ${product.quantity > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
                </button>
            </div>
        </div>
    `).join('');
}

// Show default content
function showDefaultContent() {
    const heroSection = document.querySelector('.hero');
    const categoriesSection = document.querySelector('.categories');
    const bestSellersSection = document.querySelector('.best-sellers');
    const searchSection = document.getElementById('searchResultsSection');
    
    if (heroSection) heroSection.style.display = 'flex';
    if (categoriesSection) categoriesSection.style.display = 'block';
    if (bestSellersSection) bestSellersSection.style.display = 'block';
    if (searchSection) searchSection.style.display = 'none';
    
    // Clear search input
    const searchInput = document.querySelector('input[placeholder="Search products"]');
    if (searchInput) {
        searchInput.value = '';
    }
}

// Show popup message
function showPopup(message, type = 'success') {
    const popup = document.getElementById('popupMessage');
    const popupText = document.getElementById('popupText');
    
    if (popup && popupText) {
        popupText.textContent = message;
        
        // Set background color based on type
        if (type === 'error') {
            popup.style.backgroundColor = '#f44336';
        } else if (type === 'warning') {
            popup.style.backgroundColor = '#ff9800';
        } else {
            popup.style.backgroundColor = '#4BB543';
        }
        
        popup.classList.add('visible');
        
        setTimeout(() => {
            popup.classList.remove('visible');
        }, 3000);
    }
}

// Add alias for consistency with other parts of your code
function showPopupMessage(message, type = 'success') {
    showPopup(message, type);
}

// Add to cart function (updated version)
async function addToCart(productId) {
    // Use global authToken variable for consistency
    if (!authToken) {
        showPopup('Please login to add items to cart', 'warning');
        // Trigger login modal instead of just showing message
        toggleAuthModal(true);
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showPopup('Added to cart!');
            updateCartCount();
            return true;
        } else {
            // Handle specific error cases
            if (response.status === 401) {
                // Token expired, clear it and show login
                localStorage.removeItem('authToken');
                authToken = null;
                currentUser = null;
                updateAuthButtons();
                toggleAuthModal(true);
                showPopup('Session expired. Please login again.', 'warning');
            } else {
                throw new Error(data.message || 'Failed to add to cart');
            }
            return false;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showPopup('Error adding to cart. Please try again.', 'error');
        return false;
    }
}

// Initialize search functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSearch();
    preloadProducts(); // Preload products for suggestions
});

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.querySelector('input[placeholder="Search products"]');
    
    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }
    
    // Create enhanced search container
    createSearchContainer(searchInput);
    
    // Add event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('focus', handleSearchFocus);
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchSuggestions();
        }
    });
    
    console.log('Search functionality initialized');
}

// Create enhanced search container with suggestions
function createSearchContainer(searchInput) {
    // Wrap search input in container if not already wrapped
    let container = searchInput.closest('.search-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'search-container';
        container.style.cssText = `
            position: relative; 
            display: inline-block; 
            width: 100%;
            max-width: 400px;
        `;
        
        searchInput.parentNode.insertBefore(container, searchInput);
        container.appendChild(searchInput);
    }
    
    // Style the search input for better UX
    searchInput.style.cssText += `
        width: 100%;
        padding: 0.75rem 3rem 0.75rem 2.5rem;
        border: 2px solid #e0e0e0;
        border-radius: 25px;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;
    
    // Add search icon
    const searchIcon = document.createElement('span');
    searchIcon.innerHTML = '🔍';
    searchIcon.className = 'search-icon';
    searchIcon.style.cssText = `
        position: absolute;
        left: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        color: #2d7a2d;
        font-size: 1rem;
        pointer-events: none;
        z-index: 2;
    `;
    container.insertBefore(searchIcon, searchInput);
    
    // Add search button
    const searchBtn = document.createElement('button');
    searchBtn.innerHTML = '→';
    searchBtn.className = 'search-submit-btn';
    searchBtn.style.cssText = `
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        background: linear-gradient(135deg, #2d7a2d, #4caf50);
        color: white;
        border: none;
        padding: 0.5rem 0.8rem;
        border-radius: 20px;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.3s ease;
        z-index: 2;
    `;
    searchBtn.onclick = () => performSearch(searchInput.value);
    container.appendChild(searchBtn);
    
    // Add clear button
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '×';
    clearBtn.className = 'search-clear-btn';
    clearBtn.style.cssText = `
        position: absolute;
        right: 3rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0.2rem;
        border-radius: 50%;
        display: none;
        z-index: 2;
    `;
    clearBtn.onclick = () => clearSearch(searchInput);
    container.appendChild(clearBtn);
    
    // Create suggestions dropdown
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'searchSuggestions';
    suggestionsContainer.className = 'search-suggestions';
    suggestionsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 15px 15px;
        max-height: 320px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        margin-top: 2px;
    `;
    container.appendChild(suggestionsContainer);
    
    // Add focus styles
    searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = '#2d7a2d';
        searchInput.style.boxShadow = '0 0 0 3px rgba(45, 122, 45, 0.1)';
    });
    
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            searchInput.style.borderColor = '#e0e0e0';
            searchInput.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        }, 150);
    });
}

// Handle search input with enhanced UX
function handleSearchInput(e) {
    const query = e.target.value.trim();
    const clearBtn = e.target.parentElement.querySelector('.search-clear-btn');
    const searchBtn = e.target.parentElement.querySelector('.search-submit-btn');
    
    // Show/hide clear button
    if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
    }
    
    // Update search button style
    if (searchBtn) {
        if (query) {
            searchBtn.style.background = 'linear-gradient(135deg, #2d7a2d, #4caf50)';
            searchBtn.style.transform = 'translateY(-50%) scale(1)';
        } else {
            searchBtn.style.background = 'linear-gradient(135deg, #ccc, #aaa)';
            searchBtn.style.transform = 'translateY(-50%) scale(0.9)';
        }
    }
    
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    if (query.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    // Debounce search suggestions
    searchTimeout = setTimeout(() => {
        if (query.length >= 2) {
            generateSearchSuggestions(query);
        }
    }, 200);
}

// Handle keyboard navigation and search
function handleSearchKeydown(e) {
    const suggestions = document.querySelectorAll('.suggestion-item');
    let currentIndex = Array.from(suggestions).findIndex(item => item.classList.contains('highlighted'));
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (suggestions.length > 0) {
                if (currentIndex < suggestions.length - 1) {
                    if (currentIndex >= 0) suggestions[currentIndex].classList.remove('highlighted');
                    suggestions[currentIndex + 1].classList.add('highlighted');
                } else if (currentIndex === -1) {
                    suggestions[0].classList.add('highlighted');
                }
            }
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            if (currentIndex > 0) {
                suggestions[currentIndex].classList.remove('highlighted');
                suggestions[currentIndex - 1].classList.add('highlighted');
            } else if (currentIndex === 0) {
                suggestions[currentIndex].classList.remove('highlighted');
            }
            break;
            
        case 'Enter':
            e.preventDefault();
            if (currentIndex >= 0 && suggestions[currentIndex]) {
                suggestions[currentIndex].click();
            } else {
                const query = e.target.value.trim();
                if (query) {
                    performSearch(query);
                }
            }
            break;
            
        case 'Escape':
            hideSearchSuggestions();
            e.target.blur();
            break;
    }
}

// Handle search focus
function handleSearchFocus(e) {
    const query = e.target.value.trim();
    if (query && query.length >= 2) {
        generateSearchSuggestions(query);
    }
}

// Preload products for better suggestion performance
async function preloadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
            allProducts = await response.json();
            console.log(`Loaded ${allProducts.length} products for search suggestions`);
        }
    } catch (error) {
        console.error('Error preloading products:', error);
    }
}

// Generate intelligent search suggestions
function generateSearchSuggestions(query) {
    if (allProducts.length === 0) {
        showBasicSuggestions(query);
        return;
    }
    
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // Product suggestions (top 4)
    const productMatches = allProducts
        .filter(product => 
            product.name.toLowerCase().includes(queryLower) ||
            (product.description && product.description.toLowerCase().includes(queryLower))
        )
        .slice(0, 4)
        .map(product => ({
            type: 'product',
            text: product.name,
            category: product.category,
            price: product.price,
            icon: '🛒',
            action: () => performSearch(product.name)
        }));
    
    // Category suggestions
    const categories = [...new Set(allProducts.map(p => p.category))];
    const categoryMatches = categories
        .filter(cat => cat.toLowerCase().includes(queryLower))
        .slice(0, 2)
        .map(cat => ({
            type: 'category',
            text: `Browse ${cat}`,
            count: allProducts.filter(p => p.category === cat).length,
            icon: getCategoryIcon(cat),
            action: () => window.location.href = `category.html?category=${cat}`
        }));
    
    // Farmer suggestions
    const farmers = [...new Set(allProducts
        .filter(p => p.farmerId && p.farmerId.name)
        .map(p => p.farmerId.name))];
    const farmerMatches = farmers
        .filter(farmer => farmer.toLowerCase().includes(queryLower))
        .slice(0, 2)
        .map(farmer => ({
            type: 'farmer',
            text: `Products by ${farmer}`,
            count: allProducts.filter(p => p.farmerId && p.farmerId.name === farmer).length,
            icon: '👨‍🌾',
            action: () => performSearch(`farmer:${farmer}`)
        }));
    
    suggestions.push(...productMatches, ...categoryMatches, ...farmerMatches);
    
    // Add "View all results" option
    if (suggestions.length > 0) {
        suggestions.push({
            type: 'search',
            text: `Search for "${query}"`,
            count: `View all results`,
            icon: '🔍',
            action: () => performSearch(query)
        });
    }
    
    displaySearchSuggestions(suggestions, query);
}

// Show basic suggestions when products aren't loaded
function showBasicSuggestions(query) {
    const basicSuggestions = [
        { type: 'category', text: 'Browse Vegetables', icon: '🥬', action: () => window.location.href = 'category.html?category=Vegetables' },
        { type: 'category', text: 'Browse Fruits', icon: '🍎', action: () => window.location.href = 'category.html?category=Fruits' },
        { type: 'category', text: 'Browse Dairy', icon: '🥛', action: () => window.location.href = 'category.html?category=Dairy' },
        { type: 'search', text: `Search for "${query}"`, icon: '🔍', action: () => performSearch(query) }
    ];
    
    displaySearchSuggestions(basicSuggestions, query);
}

// Display search suggestions with enhanced styling
function displaySearchSuggestions(suggestions, query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;
    
    if (suggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    let html = '';
    
    suggestions.forEach((suggestion, index) => {
        const highlightedText = highlightQuery(suggestion.text, query);
        
        html += `
            <div class="suggestion-item" 
                 data-index="${index}"
                 style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;"
                 onmouseover="this.style.background='#f8f9fa'; this.classList.add('highlighted'); removeOtherHighlights(this);"
                 onmouseout="this.style.background='white'"
                 onclick="selectSuggestion(${index}, '${suggestion.type}', '${escapeQuotes(suggestion.text)}')">
                
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <span style="font-size: 1.1rem;">${suggestion.icon}</span>
                    <div>
                        <div style="font-weight: 500; color: #333;">${highlightedText}</div>
                        ${suggestion.category ? `<div style="font-size: 0.8rem; color: #666;">${suggestion.category}</div>` : ''}
                        ${suggestion.count ? `<div style="font-size: 0.8rem; color: #666;">${suggestion.count}</div>` : ''}
                    </div>
                </div>
                
                ${suggestion.price ? `<div style="font-weight: 600; color: #2d7a2d; font-size: 0.9rem;">₹${suggestion.price}</div>` : ''}
                ${suggestion.type === 'search' ? `<div style="color: #2d7a2d; font-size: 0.8rem;">↵</div>` : ''}
            </div>
        `;
    });
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
    
    // Store suggestions for keyboard navigation
    window.currentSuggestions = suggestions;
}

// Helper functions
function getCategoryIcon(category) {
    const icons = {
        'Vegetables': '🥬',
        'Fruits': '🍎',
        'Dairy': '🥛',
        'Grains': '🌾',
        'Meat': '🥩',
        'Seafood': '🐟'
    };
    return icons[category] || '📦';
}

function highlightQuery(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark style="background: #fff3cd; padding: 0 2px; border-radius: 2px;">$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeQuotes(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function removeOtherHighlights(currentElement) {
    document.querySelectorAll('.suggestion-item').forEach(item => {
        if (item !== currentElement) {
            item.classList.remove('highlighted');
        }
    });
}

// Select suggestion and perform action
function selectSuggestion(index, type, text) {
    const suggestions = window.currentSuggestions || [];
    const suggestion = suggestions[index];
    
    if (suggestion && suggestion.action) {
        suggestion.action();
    } else {
        // Fallback
        performSearch(text);
    }
    
    hideSearchSuggestions();
}

// Main search function - redirects to search results page
function performSearch(query) {
    if (!query || !query.trim()) return;
    
    const cleanQuery = query.trim();
    
    // Add loading state to search button
    const searchBtn = document.querySelector('.search-submit-btn');
    if (searchBtn) {
        const originalContent = searchBtn.innerHTML;
        searchBtn.innerHTML = '⏳';
        searchBtn.style.pointerEvents = 'none';
        
        setTimeout(() => {
            searchBtn.innerHTML = originalContent;
            searchBtn.style.pointerEvents = 'auto';
        }, 1000);
    }
    
    // Hide suggestions
    hideSearchSuggestions();
    
    // Redirect to search results page
    window.location.href = `search.html?q=${encodeURIComponent(cleanQuery)}`;
}

// Clear search function
function clearSearch(searchInput) {
    searchInput.value = '';
    searchInput.focus();
    
    const clearBtn = searchInput.parentElement.querySelector('.search-clear-btn');
    const searchBtn = searchInput.parentElement.querySelector('.search-submit-btn');
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    if (searchBtn) {
        searchBtn.style.background = 'linear-gradient(135deg, #ccc, #aaa)';
        searchBtn.style.transform = 'translateY(-50%) scale(0.9)';
    }
    
    hideSearchSuggestions();
}

// Hide search suggestions
function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
    
    // Remove all highlights
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.classList.remove('highlighted');
    });
}

// Enhanced search functionality for "All Products" link
function showAllProducts() {
    window.location.href = 'search.html';
}

// Add keyboard shortcuts for better UX
document.addEventListener('keydown', function(e) {
    // Focus search with Ctrl+K or Cmd+K (like modern apps)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search products"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Quick search with '/' key
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search products"]');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

// Add search functionality to existing "Shop now" button
document.addEventListener('DOMContentLoaded', function() {
    const shopBtn = document.querySelector('.shop-btn');
    if (shopBtn) {
        shopBtn.addEventListener('click', function() {
            // Scroll to categories or show search
            const categoriesSection = document.querySelector('.categories');
            if (categoriesSection) {
                categoriesSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Focus search after scroll
            setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder="Search products"]');
                if (searchInput) {
                    searchInput.focus();
                }
            }, 500);
        });
    }
});

// Update "All Products" navigation link to use search page
document.addEventListener('DOMContentLoaded', function() {
    const allProductsLink = document.querySelector('a[href="#"]');
    if (allProductsLink && allProductsLink.textContent.includes('All Products')) {
        allProductsLink.href = 'search.html';
        allProductsLink.onclick = null; // Remove any existing onclick
    }
});

// Add search analytics (optional - for tracking popular searches)
function trackSearch(query) {
    // You can implement analytics tracking here
    console.log('Search performed:', query);
    
    // Example: Send to analytics service
    // analytics.track('search', { query: query, timestamp: new Date() });
}

// Enhanced error handling for search
function handleSearchError(error) {
    console.error('Search error:', error);
    
    // Show user-friendly error message
    const searchInput = document.querySelector('input[placeholder="Search products"]');
    if (searchInput) {
        searchInput.style.borderColor = '#f44336';
        searchInput.placeholder = 'Search temporarily unavailable...';
        
        setTimeout(() => {
            searchInput.style.borderColor = '#e0e0e0';
            searchInput.placeholder = 'Search products';
        }, 3000);
    }
}

// Improve search accessibility
function enhanceSearchAccessibility() {
    const searchInput = document.querySelector('input[placeholder="Search products"]');
    if (!searchInput) return;
    
    // Add ARIA attributes
    searchInput.setAttribute('role', 'searchbox');
    searchInput.setAttribute('aria-label', 'Search for fresh products');
    searchInput.setAttribute('aria-describedby', 'search-help');
    
    // Add help text
    const helpText = document.createElement('div');
    helpText.id = 'search-help';
    helpText.className = 'sr-only'; // Screen reader only
    helpText.textContent = 'Search for products by name, category, or farmer. Use arrow keys to navigate suggestions.';
    searchInput.parentElement.appendChild(helpText);
    
    // Improve suggestions accessibility
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.setAttribute('role', 'listbox');
        suggestionsContainer.setAttribute('aria-label', 'Search suggestions');
    }
}

// Call accessibility enhancements
document.addEventListener('DOMContentLoaded', enhanceSearchAccessibility);

// Add smooth transitions for better UX
function addSearchTransitions() {
    const style = document.createElement('style');
    style.textContent = `
        .search-container {
            transition: all 0.3s ease;
        }
        
        .search-container:focus-within {
            transform: translateY(-2px);
        }
        
        .search-suggestions {
            animation: slideDown 0.2s ease-out;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .suggestion-item {
            transition: all 0.2s ease;
        }
        
        .suggestion-item.highlighted {
            background-color: #f8f9fa !important;
            transform: translateX(4px);
        }
        
        .search-submit-btn:hover {
            transform: translateY(-50%) scale(1.1) !important;
            box-shadow: 0 4px 12px rgba(45, 122, 45, 0.3);
        }
        
        .search-clear-btn:hover {
            background-color: #f0f0f0 !important;
            transform: translateY(-50%) scale(1.1);
        }
        
        /* Mobile responsive improvements */
        @media (max-width: 768px) {
            .search-container {
                max-width: 100%;
            }
            
            .search-suggestions {
                max-height: 250px;
            }
            
            .suggestion-item {
                padding: 10px 12px;
                font-size: 0.9rem;
            }
        }
        
        /* Screen reader only class */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
    `;
    document.head.appendChild(style);
}

// Apply transitions
document.addEventListener('DOMContentLoaded', addSearchTransitions);

// Export functions for use in other files (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeSearch,
        performSearch,
        showAllProducts,
        clearSearch
    };
}

// Global search functions for inline onclick handlers
window.performSearch = performSearch;
window.showAllProducts = showAllProducts;
window.clearSearch = clearSearch;
window.selectSuggestion = selectSuggestion;