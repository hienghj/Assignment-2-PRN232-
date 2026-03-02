// Auth state management
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setAuth(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
        id: data.userId,
        email: data.email,
        fullName: data.fullName,
    }));
    updateAuthUI();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    navigateTo('home');
    showToast('Logged out successfully', 'info');
}

function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const user = getUser();

    // Auth buttons
    document.getElementById('authButtons').style.display = loggedIn ? 'none' : 'flex';
    document.getElementById('userMenu').style.display = loggedIn ? 'block' : 'none';

    // User name
    if (loggedIn && user) {
        document.getElementById('userName').textContent = user.fullName;
    }

    // Auth-only nav links
    document.querySelectorAll('.auth-only').forEach(el => {
        el.style.display = loggedIn ? 'flex' : 'none';
    });

    // Close dropdown
    document.getElementById('userDropdown').classList.remove('active');

    // Update cart badge
    updateCartBadge();
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('active');
}

async function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (isLoggedIn()) {
        try {
            const cart = await api.getCart();
            badge.textContent = cart.totalItems || 0;
            badge.style.display = cart.totalItems > 0 ? 'inline' : 'none';
        } catch {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
    } else {
        badge.textContent = '0';
        badge.style.display = 'none';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown').classList.remove('active');
    }
});
