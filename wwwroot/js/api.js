// API Configuration
const API_BASE = window.location.origin;

// API Helper
const api = {
    async request(method, endpoint, data = null, requireAuth = false) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (requireAuth) {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE}/api/${endpoint}`, config);

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            updateAuthUI();
            throw new Error('Session expired. Please login again.');
        }

        const text = await response.text();
        const result = text ? JSON.parse(text) : null;

        if (!response.ok) {
            throw new Error(result?.message || `Request failed (${response.status})`);
        }

        return result;
    },

    // Auth
    register: (data) => api.request('POST', 'auth/register', data),
    login: (data) => api.request('POST', 'auth/login', data),

    // Products
    getProducts: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return api.request('GET', `products?${query}`);
    },
    getProduct: (id) => api.request('GET', `products/${id}`),
    getCategories: () => api.request('GET', 'products/categories'),
    createProduct: (data) => api.request('POST', 'products', data, true),
    updateProduct: (id, data) => api.request('PUT', `products/${id}`, data, true),
    deleteProduct: (id) => api.request('DELETE', `products/${id}`, null, true),

    // Cart
    getCart: () => api.request('GET', 'cart', null, true),
    addToCart: (data) => api.request('POST', 'cart', data, true),
    updateCartItem: (id, data) => api.request('PUT', `cart/${id}`, data, true),
    removeFromCart: (id) => api.request('DELETE', `cart/${id}`, null, true),

    // Orders
    placeOrder: () => api.request('POST', 'orders', null, true),
    getOrders: () => api.request('GET', 'orders', null, true),
    getOrder: (id) => api.request('GET', `orders/${id}`, null, true),
    updateOrderStatus: (id, data) => api.request('PUT', `orders/${id}/status`, data, true),
};
