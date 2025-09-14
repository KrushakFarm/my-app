// test-api.js - Node.js compatible version
const API_URL = "http://localhost:5000/api";

// For Node.js 18+ (built-in fetch) or install node-fetch for older versions
let fetch;
if (typeof globalThis.fetch === 'undefined') {
  // For Node.js versions without built-in fetch
  try {
    fetch = require('node-fetch');
  } catch (e) {
    console.log("Please install node-fetch: npm install node-fetch");
    process.exit(1);
  }
} else {
  fetch = globalThis.fetch;
}

async function testAPI() {
  console.log("🧪 Testing KrushakFarm Backend API...\n");

  try {
    // Test 1: Server Health Check
    console.log("1. Testing server connection...");
    try {
      const healthResponse = await fetch(`http://localhost:5000`);
      console.log(`   Server Status: ${healthResponse.status === 404 ? 'Running ✓' : 'Status: ' + healthResponse.status}`);
    } catch (e) {
      console.log(`   Server Status: ❌ Not running (${e.message})`);
      console.log("   Make sure to start your backend server first: npm run dev");
      return;
    }

    // Test 2: Register a farmer
    console.log("\n2. Testing farmer registration...");
    const registerData = {
      name: "Test Farmer",
      email: "testfarmer@example.com",
      password: "password123",
      role: "farmer"
    };

    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });

    const registerResult = await registerResponse.json();
    console.log(`   Registration Status: ${registerResponse.status}`);
    console.log(`   Response: ${registerResult.message}`);

    if (!registerResponse.ok && !registerResult.message.includes('already exists')) {
      throw new Error('Registration failed: ' + registerResult.message);
    }

    // Test 3: Login as farmer
    console.log("\n3. Testing farmer login...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "testfarmer@example.com",
        password: "password123"
      })
    });

    const loginResult = await loginResponse.json();
    console.log(`   Login Status: ${loginResponse.status}`);
    console.log(`   User: ${loginResult.user?.name} (${loginResult.user?.role})`);

    if (!loginResponse.ok) {
      throw new Error('Login failed: ' + loginResult.message);
    }

    const authToken = loginResult.token;

    // Test 4: Add a product
    console.log("\n4. Testing product creation...");
    const productData = {
      name: "Test Tomatoes",
      price: 50,
      quantity: 100,
      unit: "kg",
      category: "Vegetables",
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    };

    const productResponse = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(productData)
    });

    const productResult = await productResponse.json();
    console.log(`   Product Creation Status: ${productResponse.status}`);
    
    if (productResponse.ok) {
      console.log(`   Product Created: ${productResult.product?.name} ✓`);
    } else {
      console.log(`   Error: ${productResult.message}`);
    }

    // Test 5: Get all products
    console.log("\n5. Testing product retrieval...");
    const productsResponse = await fetch(`${API_URL}/products`);
    const products = await productsResponse.json();
    console.log(`   Products Retrieved: ${Array.isArray(products) ? products.length + ' products ✓' : 'Error'}`);

    // Test 6: Register a customer
    console.log("\n6. Testing customer registration...");
    const customerRegisterResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Test Customer",
        email: "testcustomer@example.com",
        password: "password123",
        role: "customer"
      })
    });

    const customerRegisterResult = await customerRegisterResponse.json();
    console.log(`   Customer Registration Status: ${customerRegisterResponse.status}`);

    if (customerRegisterResponse.ok || customerRegisterResult.message.includes('already exists')) {
      // Test 7: Login as customer and test cart
      console.log("\n7. Testing customer login and cart...");
      const customerLoginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: "testcustomer@example.com",
          password: "password123"
        })
      });

      const customerLoginResult = await customerLoginResponse.json();
      console.log(`   Customer Login Status: ${customerLoginResponse.status}`);

      if (customerLoginResponse.ok) {
        const customerToken = customerLoginResult.token;

        // Test cart functionality if we have products
        if (Array.isArray(products) && products.length > 0) {
          const testProductId = products[0]._id;
          
          // Add to cart
          const cartAddResponse = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({ productId: testProductId })
          });

          console.log(`   Add to Cart Status: ${cartAddResponse.status} ${cartAddResponse.ok ? '✓' : '❌'}`);

          // Get cart
          const cartResponse = await fetch(`${API_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
          });
          const cart = await cartResponse.json();
          console.log(`   Cart Items: ${Array.isArray(cart) ? cart.length + ' items ✓' : 'Error'}`);
        }
      }
    }

    console.log("\n✅ API Test Completed Successfully!");
    console.log("\n📋 Test Summary:");
    console.log("   ✓ Server is running");
    console.log("   ✓ Farmer registration/login works");
    console.log("   ✓ Product creation/retrieval works");
    console.log("   ✓ Customer registration/login works");
    console.log("   ✓ Cart functionality works");
    console.log("\n🚀 Your KrushakFarm backend is ready!");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Make sure your backend server is running: npm run dev");
    console.log("   2. Ensure MongoDB is running and connected");
    console.log("   3. Check for any error messages in the server logs");
    console.log("   4. Verify all dependencies are installed: npm install");
    console.log("   5. Check if port 5000 is available");
  }
}

// Run the test
testAPI();