document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    
    // Auto-open the correct tab on initial load based on the URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
        // Trigger the native tab-switching functions already written in your files
        if (typeof switchTab === 'function') switchTab(tab);
        else if (typeof showSection === 'function') showSection(tab + '-section');
    }
});

// Helper to grab the role from cookies
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Added a quick logout function for the navbar
function logout() {
    document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
}

// Handles seamless SPA-like navigation OR redirects to a different HTML file
window.goToTab = function(targetPage, targetTab) {
    if (window.location.pathname === targetPage) {
        // We are already on the correct HTML file. Just switch the tab via JS.
        window.history.pushState({}, '', targetPage + '?tab=' + targetTab);
        renderNavbar(); // Re-render to update the 'active' underline
        
        if (typeof switchTab === 'function') switchTab(targetTab);
        else if (typeof showSection === 'function') showSection(targetTab + '-section');
    } else {
        // We need to switch HTML files
        window.location.href = targetPage + '?tab=' + targetTab;
    }
};

function renderNavbar() {
    const role = getCookie('user_role');

    if (!role && window.location.pathname !== '/') {
        window.location.href = '/'; // Kick unauthenticated users to login
        return;
    }

    // 1. Define every screen across your application
    const screens = {
        dashboard: { name: "Dashboard", page: "/dashboard.html", tabId: "dashboard" },
        roster: { name: "Staff Roster", page: "/dashboard.html", tabId: "roster" },
        floor: { name: "Live Floor Plan", page: "/pos.html", tabId: "floor" },
        pos: { name: "Point of Sale", page: "/pos.html", tabId: "pos" },
        kitchen: { name: "Kitchen Display", page: "/pos.html", tabId: "kitchen" },
        ingredients: { name: "Ingredients", page: "/inventory.html", tabId: "ingredients" },
        recipe: { name: "Recipe Builder", page: "/inventory.html", tabId: "recipe" },
        wastage: { name: "Log Wastage", page: "/inventory.html", tabId: "wastage" }
    };

    // 2. Access Control Matrix (Who sees what)
    const roleAccess = {
        admin: ['dashboard', 'roster'],
        waiter: ['floor', 'pos', 'roster'],
        chef: ['ingredients', 'recipe', 'wastage', 'roster'],
        owner: ['dashboard', 'roster', 'floor', 'pos', 'kitchen', 'ingredients', 'recipe', 'wastage']
    };

    const allowedKeys = roleAccess[role] || [];

    // 3. Determine current tab
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    let currentTab = urlParams.get('tab');
    
    // Fallback if URL has no ?tab= param
    if (!currentTab) {
        if (currentPath === '/dashboard.html') currentTab = 'dashboard';
        if (currentPath === '/pos.html') currentTab = 'floor';
        if (currentPath === '/inventory.html') currentTab = 'ingredients';
    }

    // 4. Security Check: Boot them if they try to access a hidden URL directly
    if (!allowedKeys.includes(currentTab)) {
        if (role === 'admin' || role === 'owner') window.location.href = '/dashboard.html?tab=dashboard';
        else if (role === 'waiter') window.location.href = '/pos.html?tab=floor';
        else if (role === 'chef') window.location.href = '/inventory.html?tab=ingredients';
        return;
    }

    // 5. Build the Dynamic HTML
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

    let navHTML = `
        <nav class="navbar" style="background-color: #3b82f6; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin:0; font-size:1.25rem;"><i class="fas fa-utensils mr-2"></i> Salaam's Grill</h2>
            <div class="nav-links" style="display: flex; align-items: center;">
    `;

    // Only render buttons the role has access to
    allowedKeys.forEach(key => {
        const item = screens[key];
        const isActive = (currentTab === item.tabId);
        // We apply styles inline slightly to guarantee it looks right regardless of which file it injects into
        const activeStyle = isActive ? 'font-weight: bold; opacity: 1; border-bottom: 2px solid white; padding-bottom: 0.25rem;' : 'opacity: 0.7;';
        
        navHTML += `<button onclick="goToTab('${item.page}', '${item.tabId}')" style="background: none; border: none; color: white; cursor: pointer; margin-left: 1.5rem; font-size: 1rem; transition: opacity 0.2s; ${activeStyle}">${item.name}</button>`;
    });

    navHTML += `
                <button onclick="logout()" style="background: none; border: none; color: #fecaca; cursor: pointer; margin-left: 1.5rem; font-size: 1rem;">Logout</button>
            </div>
        </nav>
    `;

    navContainer.innerHTML = navHTML;
}