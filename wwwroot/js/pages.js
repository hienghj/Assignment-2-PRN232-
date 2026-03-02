// Page rendering functions

// ===== HOME PAGE =====
async function renderHomePage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
        <section class="hero">
            <div class="hero-content">
                <div class="hero-badge">
                    <i class="fas fa-sparkles"></i> New Collection 2026
                </div>
                <h1>Discover Your <span class="highlight">Perfect Style</span></h1>
                <p>Explore our curated collection of premium clothing. From casual to formal, find pieces that define your unique look.</p>
                <div class="hero-actions">
                    <button class="btn btn-primary btn-lg" onclick="document.querySelector('.products-section').scrollIntoView({behavior:'smooth'})">
                        <i class="fas fa-shopping-bag"></i> Shop Now
                    </button>
                    <button class="btn btn-ghost btn-lg" onclick="navigateTo('register')">
                        <i class="fas fa-user-plus"></i> Join Us
                    </button>
                </div>
            </div>
        </section>

        <section class="search-section">
            <div class="search-bar">
                <i class="fas fa-search"></i>
                <input type="text" id="searchInput" placeholder="Search for clothing..." oninput="debounceSearch()">
                <select id="categoryFilter" onchange="loadProducts()">
                    <option value="">All Categories</option>
                </select>
                <button class="btn btn-primary btn-sm" onclick="loadProducts()">
                    <i class="fas fa-search"></i> Search
                </button>
            </div>
        </section>

        <section class="products-section">
            <div class="section-header">
                <h2 class="section-title">Featured Products</h2>
                <span id="productCount" style="color:var(--text-secondary);font-size:0.9rem;"></span>
            </div>
            <div class="product-grid" id="productGrid">
                <div class="empty-state">
                    <div class="loader-ring"></div>
                    <p>Loading products...</p>
                </div>
            </div>
            <div class="pagination" id="pagination"></div>
        </section>
    `;

    await loadCategories();
    await loadProducts();
}

let searchTimer;
function debounceSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadProducts, 400);
}

async function loadCategories() {
    try {
        const categories = await api.getCategories();
        const select = document.getElementById('categoryFilter');
        if (select) {
            categories.forEach(c => {
                select.innerHTML += `<option value="${c}">${c}</option>`;
            });
        }
    } catch (e) {
        console.error('Failed to load categories:', e);
    }
}

let currentPage = 1;
async function loadProducts(page = 1) {
    currentPage = page;
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const search = document.getElementById('searchInput')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';

    try {
        const result = await api.getProducts({ search, category, page, pageSize: 12 });
        const { products, totalCount, totalPages } = result;

        document.getElementById('productCount').textContent = `${totalCount} product${totalCount !== 1 ? 's' : ''} found`;

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open"></i>
                    <h2>No products found</h2>
                    <p>Try a different search or category.</p>
                </div>
            `;
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        grid.innerHTML = products.map((p, i) => `
            <div class="product-card" style="animation-delay:${i * 0.05}s" onclick="navigateTo('product', ${p.id})">
                <div class="product-card-image">
                    ${p.imageUrl
                ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy">`
                : `<div class="placeholder-img"><i class="fas fa-tshirt"></i></div>`}
                    ${p.category ? `<span class="product-badge">${p.category}</span>` : ''}
                    ${isLoggedIn() ? `
                        <div class="product-actions-overlay">
                            <button class="btn-icon" onclick="event.stopPropagation();editProduct(${p.id})" title="Edit">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn-icon" onclick="event.stopPropagation();confirmDeleteProduct(${p.id},'${p.name.replace(/'/g, "\\'")}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="product-card-body">
                    ${p.category ? `<div class="product-category">${p.category}</div>` : ''}
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">$${p.price.toFixed(2)}</div>
                </div>
                <div class="product-card-footer">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();addToCartQuick(${p.id})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();navigateTo('product', ${p.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
        `).join('');

        // Pagination
        renderPagination(totalPages, page);
    } catch (e) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Error loading products</h2>
                <p>${e.message}</p>
                <button class="btn btn-primary" onclick="loadProducts()">Try Again</button>
            </div>
        `;
    }
}

function renderPagination(totalPages, current) {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="loadProducts(${current - 1})">
        <i class="fas fa-chevron-left"></i> Prev
    </button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="loadProducts(${i})">${i}</button>`;
        } else if (i === current - 2 || i === current + 2) {
            html += `<span class="page-info">...</span>`;
        }
    }

    html += `<button ${current === totalPages ? 'disabled' : ''} onclick="loadProducts(${current + 1})">
        Next <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = html;
}

async function addToCartQuick(productId) {
    if (!isLoggedIn()) {
        showToast('Please login to add items to cart', 'error');
        navigateTo('login');
        return;
    }
    try {
        await api.addToCart({ productId, quantity: 1 });
        showToast('Added to cart!', 'success');
        updateCartBadge();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function editProduct(id) {
    navigateTo('manage', id);
}

async function confirmDeleteProduct(id, name) {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
        try {
            await api.deleteProduct(id);
            showToast('Product deleted', 'success');
            loadProducts(currentPage);
        } catch (e) {
            showToast(e.message, 'error');
        }
    }
}

// ===== PRODUCT DETAIL PAGE =====
async function renderProductDetailPage(id) {
    const main = document.getElementById('mainContent');
    main.innerHTML = `<div class="product-detail"><div class="loader-ring" style="margin:80px auto;"></div></div>`;

    try {
        const p = await api.getProduct(id);
        main.innerHTML = `
            <div class="product-detail">
                <a href="#" class="back-link" onclick="navigateTo('home')">
                    <i class="fas fa-arrow-left"></i> Back to Products
                </a>
                <div class="product-detail-grid">
                    <div class="product-detail-image">
                        ${p.imageUrl
                ? `<img src="${p.imageUrl}" alt="${p.name}">`
                : `<div class="placeholder-img"><i class="fas fa-tshirt"></i></div>`}
                    </div>
                    <div class="product-detail-info">
                        ${p.category ? `<div class="category-label">${p.category}</div>` : ''}
                        <h1>${p.name}</h1>
                        <div class="price">$${p.price.toFixed(2)}</div>
                        <div class="description">${p.description}</div>
                        <div class="quantity-selector">
                            <label>Quantity:</label>
                            <div class="quantity-controls">
                                <button onclick="changeDetailQty(-1)">−</button>
                                <input type="number" id="detailQty" value="1" min="1" max="99">
                                <button onclick="changeDetailQty(1)">+</button>
                            </div>
                        </div>
                        <div class="detail-actions">
                            <button class="btn btn-primary btn-lg" onclick="addToCartFromDetail(${p.id})">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                            <button class="btn btn-accent btn-lg" onclick="buyNow(${p.id})">
                                <i class="fas fa-bolt"></i> Buy Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Product not found</h2>
                <p>${e.message}</p>
                <button class="btn btn-primary" onclick="navigateTo('home')">Back to Home</button>
            </div>
        `;
    }
}

function changeDetailQty(delta) {
    const input = document.getElementById('detailQty');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    input.value = val;
}

async function addToCartFromDetail(productId) {
    if (!isLoggedIn()) {
        showToast('Please login to add items to cart', 'error');
        navigateTo('login');
        return;
    }
    const qty = parseInt(document.getElementById('detailQty')?.value || 1);
    try {
        await api.addToCart({ productId, quantity: qty });
        showToast(`Added ${qty} item(s) to cart!`, 'success');
        updateCartBadge();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function buyNow(productId) {
    if (!isLoggedIn()) {
        showToast('Please login to purchase', 'error');
        navigateTo('login');
        return;
    }
    const qty = parseInt(document.getElementById('detailQty')?.value || 1);
    try {
        await api.addToCart({ productId, quantity: qty });
        updateCartBadge();
        navigateTo('checkout');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== LOGIN PAGE =====
function renderLoginPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <h2>Welcome Back</h2>
                <p class="subtitle">Sign in to your account</p>
                <form id="loginForm" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label for="loginEmail">Email</label>
                        <input type="email" id="loginEmail" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Password</label>
                        <input type="password" id="loginPassword" class="form-input" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary" id="loginSubmit">
                        <i class="fas fa-sign-in-alt"></i> Sign In
                    </button>
                </form>
                <div class="auth-footer">
                    Don't have an account? <a href="#" onclick="navigateTo('register')">Sign Up</a>
                </div>
            </div>
        </div>
    `;
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginSubmit');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-ring" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

    try {
        const data = await api.login({
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value,
        });
        setAuth(data);
        showToast(`Welcome back, ${data.fullName}!`, 'success');
        navigateTo('home');
    } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

// ===== REGISTER PAGE =====
function renderRegisterPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <h2>Create Account</h2>
                <p class="subtitle">Join LUXE and start shopping</p>
                <form id="registerForm" onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label for="regName">Full Name</label>
                        <input type="text" id="regName" class="form-input" placeholder="John Doe" required>
                    </div>
                    <div class="form-group">
                        <label for="regEmail">Email</label>
                        <input type="email" id="regEmail" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <div class="form-group">
                        <label for="regPassword">Password</label>
                        <input type="password" id="regPassword" class="form-input" placeholder="Min 6 characters" required minlength="6">
                    </div>
                    <button type="submit" class="btn btn-primary" id="regSubmit">
                        <i class="fas fa-user-plus"></i> Create Account
                    </button>
                </form>
                <div class="auth-footer">
                    Already have an account? <a href="#" onclick="navigateTo('login')">Sign In</a>
                </div>
            </div>
        </div>
    `;
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('regSubmit');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-ring" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

    try {
        const data = await api.register({
            fullName: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
        });
        setAuth(data);
        showToast(`Welcome, ${data.fullName}! Account created.`, 'success');
        navigateTo('home');
    } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

// ===== CART PAGE =====
async function renderCartPage() {
    const main = document.getElementById('mainContent');

    if (!isLoggedIn()) {
        main.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h2>Login Required</h2>
                <p>Please login to view your cart.</p>
                <button class="btn btn-primary" onclick="navigateTo('login')">Login</button>
            </div>
        `;
        return;
    }

    main.innerHTML = `<div class="cart-page"><div class="loader-ring" style="margin:80px auto;"></div></div>`;

    try {
        const cart = await api.getCart();

        if (cart.items.length === 0) {
            main.innerHTML = `
                <div class="cart-page">
                    <h1><i class="fas fa-shopping-bag"></i> Your Cart</h1>
                    <div class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <h2>Your cart is empty</h2>
                        <p>Add some products to get started!</p>
                        <button class="btn btn-primary" onclick="navigateTo('home')">
                            <i class="fas fa-shopping-bag"></i> Shop Now
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        main.innerHTML = `
            <div class="cart-page">
                <h1><i class="fas fa-shopping-bag"></i> Your Cart</h1>
                <div class="cart-items">
                    ${cart.items.map(item => `
                        <div class="cart-item">
                            <div class="cart-item-image">
                                ${item.productImage
                ? `<img src="${item.productImage}" alt="${item.productName}">`
                : `<div class="placeholder-img"><i class="fas fa-tshirt"></i></div>`}
                            </div>
                            <div class="cart-item-info">
                                <h3>${item.productName}</h3>
                                <div class="price">$${item.productPrice.toFixed(2)}</div>
                            </div>
                            <div class="cart-item-quantity">
                                <div class="quantity-controls">
                                    <button onclick="updateCartItemQty(${item.id}, ${item.quantity - 1})">−</button>
                                    <input type="number" value="${item.quantity}" min="1" 
                                        onchange="updateCartItemQty(${item.id}, parseInt(this.value))">
                                    <button onclick="updateCartItemQty(${item.id}, ${item.quantity + 1})">+</button>
                                </div>
                            </div>
                            <div class="cart-item-subtotal">$${item.subtotal.toFixed(2)}</div>
                            <button class="btn-remove" onclick="removeCartItem(${item.id})">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="cart-summary">
                    <div class="cart-summary-row">
                        <span>Items</span>
                        <span>${cart.totalItems}</span>
                    </div>
                    <div class="cart-summary-row">
                        <span>Subtotal</span>
                        <span>$${cart.totalPrice.toFixed(2)}</span>
                    </div>
                    <div class="cart-summary-row">
                        <span>Shipping</span>
                        <span style="color:var(--secondary)">Free</span>
                    </div>
                    <div class="cart-summary-row total">
                        <span>Total</span>
                        <span class="amount">$${cart.totalPrice.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-primary btn-lg" onclick="navigateTo('checkout')">
                        <i class="fas fa-lock"></i> Proceed to Checkout
                    </button>
                </div>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Error loading cart</h2>
                <p>${e.message}</p>
            </div>
        `;
    }
}

async function updateCartItemQty(cartItemId, newQty) {
    if (newQty < 1) {
        removeCartItem(cartItemId);
        return;
    }
    try {
        await api.updateCartItem(cartItemId, { quantity: newQty });
        renderCartPage();
        updateCartBadge();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function removeCartItem(cartItemId) {
    try {
        await api.removeFromCart(cartItemId);
        showToast('Item removed from cart', 'info');
        renderCartPage();
        updateCartBadge();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== CHECKOUT PAGE =====
async function renderCheckoutPage() {
    const main = document.getElementById('mainContent');

    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }

    main.innerHTML = `<div class="checkout-page"><div class="loader-ring" style="margin:80px auto;"></div></div>`;

    try {
        const cart = await api.getCart();

        if (cart.items.length === 0) {
            navigateTo('cart');
            return;
        }

        main.innerHTML = `
            <div class="checkout-page">
                <a href="#" class="back-link" onclick="navigateTo('cart')">
                    <i class="fas fa-arrow-left"></i> Back to Cart
                </a>
                <h1><i class="fas fa-credit-card"></i> Checkout</h1>
                <div class="checkout-summary">
                    <h3 style="margin-bottom:16px;font-size:1.1rem;">Order Summary</h3>
                    ${cart.items.map(item => `
                        <div class="checkout-item">
                            <div>
                                <strong>${item.productName}</strong>
                                <span style="color:var(--text-secondary);margin-left:8px;">× ${item.quantity}</span>
                            </div>
                            <div style="font-weight:600;">$${item.subtotal.toFixed(2)}</div>
                        </div>
                    `).join('')}
                    <div class="checkout-total">
                        <span>Total</span>
                        <span class="amount">$${cart.totalPrice.toFixed(2)}</span>
                    </div>
                </div>

                <button class="btn btn-primary btn-lg" style="width:100%;justify-content:center;padding:18px;" onclick="handlePlaceOrder()" id="placeOrderBtn">
                    <i class="fas fa-check-circle"></i> Place Order — $${cart.totalPrice.toFixed(2)}
                </button>
            </div>
        `;
    } catch (e) {
        showToast(e.message, 'error');
        navigateTo('cart');
    }
}

async function handlePlaceOrder() {
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-ring" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div> Processing...';

    try {
        const order = await api.placeOrder();
        showToast(`Order #${order.id} placed successfully!`, 'success');
        updateCartBadge();
        navigateTo('orders');
    } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
    }
}

// ===== ORDERS PAGE =====
async function renderOrdersPage() {
    const main = document.getElementById('mainContent');

    if (!isLoggedIn()) {
        main.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h2>Login Required</h2>
                <p>Please login to view your orders.</p>
                <button class="btn btn-primary" onclick="navigateTo('login')">Login</button>
            </div>
        `;
        return;
    }

    main.innerHTML = `<div class="orders-page"><div class="loader-ring" style="margin:80px auto;"></div></div>`;

    try {
        const orders = await api.getOrders();

        if (orders.length === 0) {
            main.innerHTML = `
                <div class="orders-page">
                    <h1><i class="fas fa-receipt"></i> My Orders</h1>
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h2>No orders yet</h2>
                        <p>Place your first order by shopping our products!</p>
                        <button class="btn btn-primary" onclick="navigateTo('home')">
                            <i class="fas fa-shopping-bag"></i> Shop Now
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        main.innerHTML = `
            <div class="orders-page">
                <h1><i class="fas fa-receipt"></i> My Orders</h1>
                ${orders.map(order => `
                    <div class="order-card">
                        <div class="order-header">
                            <div>
                                <span class="order-id">Order #${order.id}</span>
                                <span class="order-date" style="margin-left:16px;">
                                    <i class="fas fa-calendar"></i> ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <span class="order-status ${order.status}">${order.status}</span>
                        </div>
                        <div class="order-items">
                            ${order.items.map(item => `
                                <div class="order-item">
                                    <div class="order-item-img">
                                        ${item.productImage
                ? `<img src="${item.productImage}" alt="${item.productName}">`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);"><i class="fas fa-tshirt"></i></div>`}
                                    </div>
                                    <div class="order-item-details">
                                        <h4>${item.productName}</h4>
                                        <span>Qty: ${item.quantity} × $${item.price.toFixed(2)}</span>
                                    </div>
                                    <div class="order-item-price">$${item.subtotal.toFixed(2)}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-footer">
                            <span style="color:var(--text-secondary);">${order.items.length} item(s)</span>
                            <div class="order-total">
                                Total: <span style="color:var(--primary-light);">$${order.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        main.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Error loading orders</h2>
                <p>${e.message}</p>
            </div>
        `;
    }
}

// ===== MANAGE PRODUCTS PAGE =====
let editingProductId = null;

async function renderManagePage(editId = null) {
    const main = document.getElementById('mainContent');

    if (!isLoggedIn()) {
        main.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h2>Login Required</h2>
                <p>Please login to manage products.</p>
                <button class="btn btn-primary" onclick="navigateTo('login')">Login</button>
            </div>
        `;
        return;
    }

    main.innerHTML = `
        <div class="manage-page">
            <div class="manage-header">
                <h1><i class="fas fa-boxes-stacked"></i> Manage Products</h1>
                <button class="btn btn-primary" onclick="toggleProductForm()" id="addProductBtn">
                    <i class="fas fa-plus"></i> Add Product
                </button>
            </div>
            <div id="productFormContainer"></div>
            <div id="productTableContainer">
                <div class="loader-ring" style="margin:40px auto;"></div>
            </div>
        </div>
    `;

    await loadManageProducts();

    if (editId) {
        await showEditForm(editId);
    }
}

function toggleProductForm(product = null) {
    const container = document.getElementById('productFormContainer');
    editingProductId = product ? product.id : null;

    if (container.innerHTML && !product) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="product-form-card">
            <h2>${product ? 'Edit Product' : 'New Product'}</h2>
            <form id="productForm" onsubmit="handleProductSubmit(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" class="form-input" id="pName" value="${product?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Price *</label>
                        <input type="number" class="form-input" id="pPrice" step="0.01" min="0.01" value="${product?.price || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea class="form-input" id="pDescription" required>${product?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Product Image</label>
                    <div class="image-upload-area" id="imageUploadArea">
                        <div class="upload-tabs">
                            <button type="button" class="upload-tab active" onclick="switchUploadTab('file')" id="tabFile">
                                <i class="fas fa-upload"></i> Upload File
                            </button>
                            <button type="button" class="upload-tab" onclick="switchUploadTab('url')" id="tabUrl">
                                <i class="fas fa-link"></i> Paste URL
                            </button>
                        </div>
                        <div id="uploadFileSection">
                            <div class="file-drop-zone" id="fileDropZone" onclick="document.getElementById('pImageFile').click()">
                                <input type="file" id="pImageFile" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none" onchange="handleImagePreview(this)">
                                <div id="fileDropContent">
                                    <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--primary);"></i>
                                    <p style="margin:8px 0 4px;font-weight:500;">Click to choose file or drag & drop</p>
                                    <p style="font-size:0.8rem;color:var(--text-muted);">JPEG, PNG, GIF, WebP — Max 5MB</p>
                                </div>
                            </div>
                        </div>
                        <div id="uploadUrlSection" style="display:none;">
                            <input type="url" class="form-input" id="pImage" value="${product?.imageUrl || ''}" placeholder="https://example.com/image.jpg" oninput="previewUrlImage(this.value)">
                        </div>
                        <div id="imagePreview" style="display:${product?.imageUrl ? 'block' : 'none'};">
                            <div class="preview-container">
                                <img id="previewImg" src="${product?.imageUrl || ''}" alt="Preview">
                                <button type="button" class="btn-remove-preview" onclick="clearImagePreview()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <input type="text" class="form-input" id="pCategory" value="${product?.category || ''}" placeholder="e.g. T-Shirts, Jeans">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="productSubmitBtn">
                        <i class="fas ${product ? 'fa-save' : 'fa-plus'}"></i> ${product ? 'Update' : 'Create'} Product
                    </button>
                    <button type="button" class="btn btn-ghost" onclick="toggleProductForm()">Cancel</button>
                </div>
            </form>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth' });
}

async function showEditForm(id) {
    try {
        const product = await api.getProduct(id);
        toggleProductForm(product);
    } catch (e) {
        showToast('Product not found', 'error');
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('productSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-ring" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div> Saving...';

    try {
        // Check if there's a file to upload
        let imageUrl = document.getElementById('pImage')?.value || null;
        const fileInput = document.getElementById('pImageFile');

        if (fileInput && fileInput.files.length > 0) {
            // Upload the image file first
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            const uploadResponse = await fetch('/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                const err = await uploadResponse.json();
                throw new Error(err.message || 'Failed to upload image');
            }

            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
        }

        const data = {
            name: document.getElementById('pName').value,
            price: parseFloat(document.getElementById('pPrice').value),
            description: document.getElementById('pDescription').value,
            imageUrl: imageUrl,
            category: document.getElementById('pCategory').value || null,
        };

        if (editingProductId) {
            await api.updateProduct(editingProductId, data);
            showToast('Product updated!', 'success');
        } else {
            await api.createProduct(data);
            showToast('Product created!', 'success');
        }
        editingProductId = null;
        document.getElementById('productFormContainer').innerHTML = '';
        await loadManageProducts();
    } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fas ${editingProductId ? 'fa-save' : 'fa-plus'}"></i> ${editingProductId ? 'Update' : 'Create'} Product`;
    }
}

// Image upload helper functions
function switchUploadTab(tab) {
    document.getElementById('tabFile').classList.toggle('active', tab === 'file');
    document.getElementById('tabUrl').classList.toggle('active', tab === 'url');
    document.getElementById('uploadFileSection').style.display = tab === 'file' ? 'block' : 'none';
    document.getElementById('uploadUrlSection').style.display = tab === 'url' ? 'block' : 'none';
}

function handleImagePreview(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            showToast('File size must be less than 5MB', 'error');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            img.src = e.target.result;
            preview.style.display = 'block';

            // Update drop zone text
            document.getElementById('fileDropContent').innerHTML = `
                <i class="fas fa-check-circle" style="font-size:1.5rem;color:var(--secondary);"></i>
                <p style="margin:4px 0;font-weight:500;color:var(--secondary);">${file.name}</p>
                <p style="font-size:0.8rem;color:var(--text-muted);">${(file.size / 1024).toFixed(1)} KB — Click to change</p>
            `;
        };
        reader.readAsDataURL(file);
    }
}

function previewUrlImage(url) {
    const preview = document.getElementById('imagePreview');
    const img = document.getElementById('previewImg');
    if (url) {
        img.src = url;
        img.onerror = () => { preview.style.display = 'none'; };
        img.onload = () => { preview.style.display = 'block'; };
    } else {
        preview.style.display = 'none';
    }
}

function clearImagePreview() {
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImg').src = '';
    const fileInput = document.getElementById('pImageFile');
    if (fileInput) fileInput.value = '';
    const urlInput = document.getElementById('pImage');
    if (urlInput) urlInput.value = '';
    document.getElementById('fileDropContent').innerHTML = `
        <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--primary);"></i>
        <p style="margin:8px 0 4px;font-weight:500;">Click to choose file or drag & drop</p>
        <p style="font-size:0.8rem;color:var(--text-muted);">JPEG, PNG, GIF, WebP — Max 5MB</p>
    `;
}

async function loadManageProducts() {
    const container = document.getElementById('productTableContainer');
    if (!container) return;

    try {
        const result = await api.getProducts({ pageSize: 100 });
        const products = result.products;

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h2>No products yet</h2>
                    <p>Create your first product!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="manage-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>
                                ${p.imageUrl
                ? `<img src="${p.imageUrl}" class="product-thumb" alt="${p.name}">`
                : `<div class="product-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);background:var(--bg-secondary);"><i class="fas fa-tshirt"></i></div>`}
                            </td>
                            <td><strong>${p.name}</strong></td>
                            <td><span style="color:var(--primary-light);">${p.category || '—'}</span></td>
                            <td><strong>$${p.price.toFixed(2)}</strong></td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-ghost btn-sm" onclick="showEditForm(${p.id})">
                                        <i class="fas fa-pen"></i> Edit
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteProduct(${p.id},'${p.name.replace(/'/g, "\\'")}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:40px;">${e.message}</p>`;
    }
}
