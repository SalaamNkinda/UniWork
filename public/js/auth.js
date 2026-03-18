// 1. COOKIE HELPER FUNCTIONS 
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
}

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

// 2. HASHING FUNCTION (SHA-256)
async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3. ON PAGE LOAD: Check "Remember Me"
window.onload = () => {
    const rememberedUser = getCookie('remembered_user');
    if (rememberedUser) {
        document.getElementById('username').value = rememberedUser;
        document.getElementById('rememberMe').checked = true;
    }
};

// 4. LOGIN LOGIC 
document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const pinInput = document.getElementById('password');
    const rememberMe = document.getElementById('rememberMe').checked;
    
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    const username = usernameInput.value.toLowerCase().trim();
    const pin = pinInput.value;

    try {
        // Hash the PIN before checking with the backend
        const hashedPin = await hashPin(pin);

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, pin, hashedPin })
        });

        // Safely check if the response is actually JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();

            if (data.success) {
                // Handle "Remember Me" Cookie
                if (rememberMe) {
                    setCookie('remembered_user', username, 30); 
                } else {
                    setCookie('remembered_user', '', -1); 
                }

                setCookie('user_role', data.role, 1);
                setCookie('current_user', username, 1);
                
                // Redirect based on role
                if (data.role === 'admin') {
                    window.location.href = '/dashboard.html?tab=dashboard';
                } else if (data.role === 'waiter') {
                    window.location.href = '/pos.html?tab=floor';
                } else if (data.role === 'chef') {
                    window.location.href = '/pos.html?tab=kitchen';
                }
            } else {
                // Display the actual error sent by the server (e.g., "Invalid username or PIN.")
                showError(data.message || 'Invalid Employee ID or PIN.');
            }
        } else {
            // The server crashed and returned something else (like an HTML error page)
            showError('Server error. Please try again later.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error or server is unreachable.');
    }

    // Helper to trigger the error animation
    function showError(message) {
        errorText.innerText = message;
        errorDiv.classList.remove('hidden');
        errorDiv.classList.remove('shake');
        void errorDiv.offsetWidth; // Trigger DOM reflow to restart animation
        errorDiv.classList.add('shake');
    }
});