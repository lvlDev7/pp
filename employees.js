
// employees.js - Handle Employee Management

// Modal Handling
window.openEmployeeModal = function () {
    document.getElementById('add-employee-modal').style.display = 'flex';
}

window.closeEmployeeModal = function () {
    document.getElementById('add-employee-modal').style.display = 'none';
}

// Avatar Preview
window.previewAvatar = function (event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('avatar-preview').src = URL.createObjectURL(file);
    }
}

// Save Employee
document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect Data
    const firstName = document.getElementById('emp-firstname').value;
    const lastName = document.getElementById('emp-lastname').value;
    const email = document.getElementById('emp-email').value;
    const password = document.getElementById('emp-password').value;
    const jobTitle = document.getElementById('emp-jobtitle').value;
    const rank = document.getElementById('emp-rank').value;
    const avatarFile = document.getElementById('avatar-upload').files[0];

    const btn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Speichere...';

    try {
        // 1. Upload Avatar (if exists)
        let avatarUrl = null;
        if (avatarFile && window.supa) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await window.supa.storage
                .from('avatars')
                .upload(fileName, avatarFile);

            if (uploadError) throw new Error('Bild-Upload fehlgeschlagen: ' + uploadError.message);

            // Get Public URL
            const { data: publicData } = window.supa.storage
                .from('avatars')
                .getPublicUrl(fileName);
            avatarUrl = publicData.publicUrl;
        }

        // 2. Create User (Using a temp client to avoid logging out admin)
        // We assume 'supabase' global exists from CDN
        const tempClient = window.supabase.createClient(window.SUPABASE_PROJECT_URL, window.SUPABASE_ANON_KEY);

        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    job_title: jobTitle,
                    rank: rank,
                    role: 'handwerker' // Default role
                }
            }
        });

        if (authError) throw new Error('Benutzer konnte nicht angelegt werden: ' + authError.message);

        const newUserId = authData.user?.id;
        if (!newUserId) throw new Error('Keine User-ID zurückerhalten (Email Confirmation?)');

        // 3. Update Profile (Since Trigger might have created it, but we have extra fields)
        // Wait a moment for trigger, OR just Upsert.
        // If we rely on the trigger in `01_schema_core.sql`, it inserts only basic fields.
        // We should update the profile with the rest.

        // We use the MAIN client (Admin) to update the profile, as we have rights (hopefully)
        // or the temp client if it's "Users can update own profile".
        // Let's use the temp client to be safe as "User" matching ID.

        const updates = {
            id: newUserId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            job_title: jobTitle,
            rank: rank,
            avatar_url: avatarUrl,
            role: 'handwerker',
            status: 'aktiv'
        };

        const { error: profileError } = await tempClient
            .from('profiles')
            .upsert(updates);

        if (profileError) throw new Error('Profil konnte nicht aktualisiert werden: ' + profileError.message);

        alert('Mitarbeiter erfolgreich angelegt! (Bitte Email bestätigen)');
        window.closeEmployeeModal();
        window.location.reload(); // Refresh to see new employee

    } catch (err) {
        console.error(err);
        alert('Fehler: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalBtnText;
    }
});

// Load Employees on Page Load
async function loadRealEmployees() {
    if (!window.supa) return;

    // Check if we are on employees page
    const container = document.querySelector('.stats-grid');
    if (!container) return;

    const { data: employees, error } = await window.supa
        .from('profiles')
        .select('*')
        .eq('status', 'aktiv'); // Only active

    if (error || !employees || employees.length === 0) return; // stick to mocks if empty

    // Clear existing content but save the "Add New" button if it exists
    let addNewBtn = container.querySelector('.card-add-new');

    // If not found by class (old HTML), try last child logic or create it
    if (!addNewBtn) {
        // Fallback or just re-create it dynamically if missing
        addNewBtn = document.createElement('div');
        addNewBtn.className = 'card card-add-new';
        addNewBtn.style.textAlign = 'center';
        addNewBtn.style.alignItems = 'center';
        addNewBtn.style.justifyContent = 'center';
        addNewBtn.style.border = '2px dashed #e0e0e0';
        addNewBtn.style.backgroundColor = 'transparent';
        addNewBtn.style.cursor = 'pointer';
        addNewBtn.onclick = window.openEmployeeModal;
        addNewBtn.innerHTML = `
            <i class="fas fa-plus" style="font-size: 2rem; color: #ccc;"></i>
            <p style="margin-top: 10px; color: var(--text-muted);">Mitarbeiter hinzufügen</p>
        `;
    }

    container.innerHTML = ''; // Full clear (removes loading indicator too)

    employees.forEach(emp => {
        const fullName = `${emp.first_name || ''} ${emp.last_name || emp.username || 'Unbekannt'}`;
        const job = emp.job_title || emp.role || 'Mitarbeiter';
        const rank = emp.rank || '';
        const status = emp.status || 'aktiv';
        const avatar = emp.avatar_url || null;

        const card = document.createElement('div');
        card.className = 'card';
        card.style.textAlign = 'center';
        card.style.alignItems = 'center';

        const avatarHtml = avatar
            ? `<img src="${avatar}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px; object-fit: cover;">`
            : `<div style="width: 80px; height: 80px; background-color: #eee; border-radius: 50%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #aaa;"><i class="fas fa-user"></i></div>`;

        card.innerHTML = `
            ${avatarHtml}
            <h3 style="color: var(--text-color); margin-bottom: 5px;">${fullName}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 5px;">${job}</p>
            ${rank ? `<p style="color: #666; font-size: 0.8rem; margin-bottom: 15px; font-weight: 500;">${rank}</p>` : ''}
            <div style="display: flex; gap: 10px;">
                <span style="background-color: rgba(80, 227, 194, 0.2); color: #2ecc71; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${status}</span>
            </div>
        `;
        container.appendChild(card);
    });

    container.appendChild(addNewBtn);
}

// Init
window.addEventListener('load', () => {
    // Wait for Supabase to be ready (short check or direct call if we trust order)
    if (window.supa) {
        loadRealEmployees();
    } else {
        // Fallback if script loads faster than client init
        setTimeout(loadRealEmployees, 100);
    }
});
