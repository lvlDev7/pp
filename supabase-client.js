
// Initialize Supabase Client
// Project ID: wzjpxncyxnihkfqsskkn

// Expose checks to window so other scripts can see them
window.SUPABASE_PROJECT_URL = 'https://wzjpxncyxnihkfqsskkn.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6anB4bmN5eG5paGtmcXNza2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjcxMzIsImV4cCI6MjA4MjYwMzEzMn0.NTzcVQfgHhD22zCdpQh6vERuGWORp03NgPfnEselWqo';

window.initSupabase = function () {
    if (window.supa) return window.supa; // Already initialized

    if (typeof window.supabase !== 'undefined') {
        window.supa = window.supabase.createClient(window.SUPABASE_PROJECT_URL, window.SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                storage: window.localStorage,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        console.log('Supabase Client Initialized via initSupabase()');
        return window.supa;
    } else {
        console.warn('Supabase SDK not loaded yet.');
        return null;
    }
};

window.checkAuth = async function () {
    const supa = window.initSupabase();
    if (!supa) return;

    const { data: { session }, error } = await supa.auth.getSession();

    // Get current path to avoid redirect loops
    const path = window.location.pathname;
    const isMobile = path.includes('/mobile/');
    const isLoginPage = path.includes('login.html');

    if (error || !session) {
        if (!isLoginPage) {
            console.log('No active session, redirecting to login...');
            if (isMobile) {
                // If in mobile folder, relative path 'login.html' goes to mobile/login.html
                window.location.href = 'login.html';
            } else {
                window.location.href = 'login.html';
            }
        }
    } else {
        console.log('User is authenticated:', session.user.email);
        // Optional: Redirect away from login if already auth
        if (isLoginPage) {
            window.location.href = 'index.html';
        }
    }
    return session;
};

// Attempt initialization immediately
window.initSupabase();

window.resetPassword = async function (email) {
    const supa = window.initSupabase();
    if (!supa) return { error: { message: 'Supabase SDK not loaded' } };

    // Redirect to a specific page or just let Supabase handle the magic link
    // For now, we point back to index or a specific update-password page
    // Note: User needs to handle the Update Password flow when they click the link
    return await supa.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/index.html',
    });
};
