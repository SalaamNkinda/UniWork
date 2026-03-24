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
        admin: ['dashboard', 'roster', 'floor', 'pos', 'kitchen', 'ingredients', 'recipe', 'wastage'],
        waiter: ['floor', 'pos', 'roster'],
        chef: ['kitchen', 'ingredients', 'recipe', 'wastage', 'roster'],
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
        if (role === 'admin') window.location.href = '/dashboard.html?tab=dashboard';
        else if (role === 'waiter') window.location.href = '/pos.html?tab=floor';
        else if (role === 'chef') window.location.href = '/pos.html?tab=kitchen';
        return;
    }

    // 5. Build the Dynamic HTML for a Left Sidebar
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

    let navHTML = `
        <nav class="sidebar-nav" style="background-color: #c74006; color: white; width: 250px; height: 100vh; padding: 2rem 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; box-sizing: border-box; z-index: 1000; box-shadow: 2px 0 5px rgba(0,0,0,0.1);" overflow-x: hidden;">
            
            <h2 style="margin: 0 0 2.5rem 0; font-size: 1.25rem; text-align: left; padding: 0 1.5rem;">
                <i class="fas fa-utensils mr-2"></i> Bald Gingers' Grill
            </h2>
            
            <div class="nav-links" style="display: flex; flex-direction: column; flex-grow: 1; width: 100p%; box-sizing: border-box; overflow-x: hidden;">
    `;

    // Only render buttons the role has access to
    allowedKeys.forEach(key => {
        const item = screens[key];
        const isActive = (currentTab === item.tabId);
        
        // Base styling for sidebar buttons (left-aligned, full width)
        const baseStyle = 'background: none; border: none; color: white; cursor: pointer; font-size: 1rem; transition: all 0.2s; text-align: left; padding: 1rem 1.5rem; width: 100%; display: block; box-sizing: border-box; outline: none;';
        
        // Active styling (white left border and slight background highlight)
        const activeStyle = isActive 
            ? 'background-color: rgba(255,255,255,0.15); font-weight: bold; border-left: 4px solid white;' 
            : 'opacity: 0.75; border-left: 4px solid transparent;';
        
        navHTML += `
            <button onclick="goToTab('${item.page}', '${item.tabId}')" 
                    onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" 
                    onmouseout="this.style.backgroundColor='${isActive ? 'rgba(255,255,255,0.15)' : 'transparent'}'"
                    style="${baseStyle} ${activeStyle}">
                ${item.name}
            </button>`;
    });

    navHTML += `
            </div>
            
            <div style="padding: 1rem 1.5rem; margin-top: auto;">
                <button onclick="logout()" 
                        onmouseover="this.style.opacity='1'" 
                        onmouseout="this.style.opacity='0.8'"
                        style="background: none; border: none; color: #fecaca; cursor: pointer; font-size: 1rem; text-align: left; width: 100%; padding: 0.5rem 0; opacity: 0.8; transition: opacity 0.2s; outline: none;">
                    <i class="fas fa-sign-out-alt mr-2"></i> Logout
                </button>
            </div>
        </nav>
    `;

    navContainer.innerHTML = navHTML;

    // 6. Push the main body content to the right so it doesn't hide behind the sidebar
    document.body.style.marginLeft = "250px";
}