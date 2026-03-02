// ===== ROUTER =====
function navigateTo(page, param = null) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Close mobile menu
    document.getElementById('navLinks').classList.remove('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Route to page
    switch (page) {
        case 'home':
            renderHomePage();
            break;
        case 'product':
            renderProductDetailPage(param);
            break;
        case 'login':
            renderLoginPage();
            break;
        case 'register':
            renderRegisterPage();
            break;
        case 'cart':
            renderCartPage();
            break;
        case 'checkout':
            renderCheckoutPage();
            break;
        case 'orders':
            renderOrdersPage();
            break;
        case 'manage':
            renderManagePage(param);
            break;
        default:
            renderHomePage();
    }
}

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <p>${message}</p>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== LOADING =====
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

// ===== NAVBAR SCROLL EFFECT =====
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    navigateTo('home');
});
