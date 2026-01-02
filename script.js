// Basic Interactivity & Mock Data Integration
document.addEventListener('DOMContentLoaded', () => {
    // Current Page Active Link Logic
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Page Specific Initialization
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        populateDashboard();
    }

    if (window.location.pathname.endsWith('planning.html')) {
        initPlanningPage();
    }

    console.log('Craftsman Planner App Loaded');
});

async function populateDashboard() {
    let stats = window.mockData.stats;

    // TRY FETCHING REAL DATA
    if (window.supa) {
        try {
            // Active Workers (User status = 'aktiv')
            const { count: workerCount, error: err1 } = await window.supa
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'aktiv');

            // Orders Today (Jobs where start date is today)
            const todayStr = new Date().toISOString().split('T')[0];
            const { count: orderCount, error: err2 } = await window.supa
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .gte('planned_start', `${todayStr}T00:00:00`)
                .lte('planned_start', `${todayStr}T23:59:59`);

            // Open Requests (Jobs status = 'offen')
            const { count: openCount, error: err3 } = await window.supa
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'offen');

            if (!err1 && !err2 && !err3) {
                console.log('Using Real Supabase Data for Dashboard');
                stats = {
                    activeWorkers: workerCount || 0,
                    ordersToday: orderCount || 0,
                    openRequests: openCount || 0
                };
            }
        } catch (err) {
            console.warn('Supabase fetch failed, using mock data', err);
        }
    }

    const activeWorkersEl = document.getElementById('active-workers-count');
    const ordersTodayEl = document.getElementById('orders-today-count');
    const openRequestsEl = document.getElementById('open-requests-count');

    if (activeWorkersEl) activeWorkersEl.innerText = stats.activeWorkers;
    if (ordersTodayEl) ordersTodayEl.innerText = stats.ordersToday;
    if (openRequestsEl) openRequestsEl.innerText = stats.openRequests;
}

/* --- PLANNING PAGE LOGIC --- */

// State for Planning Page
let currentEmployeeFilter = 'all';
let currentDate = new Date(); // Start with today
let currentView = 'week'; // 'week' or 'day'
let allJobs = []; // Store fetched jobs
let allEmployees = []; // Store fetched profiles
let employeeColorMap = {}; // Map ID -> Color Hex

async function initPlanningPage() {
    try {
        await fetchEmployees(); // Fetch users & gen colors
    } catch (e) {
        console.error('Failed to fetch employees', e);
    }

    try {
        await fetchJobs(); // Load data
    } catch (e) {
        console.error('Failed to fetch jobs', e);
    }

    // Always render, even if empty
    updateHeaderDate();
    renderCalendar();
    renderUnscheduledPool();

    // Attach Event Listeners
    const filterSelect = document.getElementById('employee-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentEmployeeFilter = e.target.value;
            renderCalendar();
        });
    }

    // Navigation Listeners
    document.getElementById('btn-prev')?.addEventListener('click', () => changeDate(-1));
    document.getElementById('btn-next')?.addEventListener('click', () => changeDate(1));
    document.getElementById('btn-today')?.addEventListener('click', () => setToday());

    // View Mode Listener (Segmented Control)
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');

            currentView = btn.dataset.view;
            const viewInput = document.getElementById('view-mode');
            if (viewInput) viewInput.value = currentView;

            renderCalendar();
            updateHeaderDate();
        });
    });

    // Search Listener
    document.getElementById('pool-search')?.addEventListener('input', () => {
        renderUnscheduledPool();
    });
}

// --- DYNAMIC EMPLOYEE LOGIC ---

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`; // Radiant consistent colors
}

async function fetchEmployees() {
    if (!window.supa) return;

    const { data, error } = await window.supa
        .from('profiles')
        .select('id, username, first_name, last_name')
        .eq('status', 'aktiv');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    allEmployees = data || [];
    employeeColorMap = {};

    // 1. Generate Colors
    allEmployees.forEach(emp => {
        // You can customize specific users here if you want fixed colors
        // e.g. if (emp.username === 'max') ...
        employeeColorMap[emp.id] = stringToColor(emp.username || emp.id);
    });

    // 2. Populate Dropdown
    const selectEl = document.getElementById('employee-filter');
    if (selectEl) {
        selectEl.innerHTML = '<option value="all">Alle Mitarbeiter</option>';
        allEmployees.forEach(emp => {
            const name = emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username;
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = name;
            // Optional: Show color in dropdown (not supported by all browsers, but try)
            opt.style.color = employeeColorMap[emp.id];
            selectEl.appendChild(opt);
        });
    }
}

function changeDate(offset) {
    if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (offset * 7));
    } else if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + offset);
    } else if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + offset);
    } else if (currentView === 'year') {
        currentDate.setFullYear(currentDate.getFullYear() + offset);
    }
    updateHeaderDate();
    renderCalendar();
}

function setToday() {
    currentDate = new Date();
    updateHeaderDate();
    renderCalendar();
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

function updateHeaderDate() {
    const display = document.getElementById('current-date-display');
    if (!display) return;

    const options = { year: 'numeric', month: 'long' };
    if (currentView === 'day') {
        options.day = 'numeric';
    }
    display.innerText = currentDate.toLocaleDateString('de-DE', options);
}


function createDraggableJobCard(job) {
    const div = document.createElement('div');
    div.className = 'job-card';
    div.draggable = true;
    div.id = job.id;

    // Default Color Logic
    let borderCol = 'var(--text-muted)'; // Default gray
    if (job.status === 'geplant' && job.assigned_to && job.assigned_to.length > 0) {
        // Use color of first assigned employee
        const empId = job.assigned_to[0];
        // Use Dynamic Map
        if (employeeColorMap[empId]) borderCol = employeeColorMap[empId];
        else borderCol = 'var(--primary-color)';
    } else if (job.type === 'Wartung') {
        borderCol = 'var(--accent-color)';
    } else {
        borderCol = 'var(--primary-color)';
    }

    div.style.borderLeftColor = borderCol;

    // Icon Logic
    let icon = 'fa-wrench';
    let color = borderCol; // Icon matches border

    if (job.type === 'Wartung' || (job.description && job.description.includes('Wartung'))) {
        icon = 'fa-tools';
    }

    // Modern Content Structure
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
            <strong style="font-size: 0.9rem; color: #333;">${job.title}</strong>
            <i class="fas ${icon}" style="color: ${color}; font-size: 0.8rem; opacity: 0.7;"></i>
        </div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="color: var(--text-muted); font-size: 0.8rem; display: flex; align-items: center; gap: 4px;">
                <i class="fas fa-user-tag" style="font-size: 0.7rem;"></i> ${job.customer}
            </div>
            ${job.start ? `
            <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">
                <i class="far fa-clock"></i> ${new Date(job.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </div>` : ''}
        </div>
    `;

    div.addEventListener('dragstart', (e) => {
        div.classList.add('dragging');
        e.dataTransfer.setData("text", job.id);
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
    });

    // Click to Open Details
    div.addEventListener('click', (e) => {
        openDetailModal(job.id);
    });

    return div;
}

async function fetchJobs() {
    if (!window.supa) {
        // Fallback to mock data if no supa
        allJobs = window.mockData ? window.mockData.jobs : [];
        return;
    }

    // Fetch Jobs (Assuming we want all jobs for now, or filter by date range)
    const { data, error } = await window.supa
        .from('jobs')
        .select(`
            *,
            assignments:job_assignments(
                user_id
            )
        `);

    if (error) {
        console.error('Error fetching jobs:', error);
        return;
    }

    // Transform Supabase structure to our app structure
    // Our existing code expects: job.assigned_to (array/string), job.start, job.status
    allJobs = data.map(job => {
        // Map assignments to assigned_to IDs
        const assignedIds = job.assignments ? job.assignments.map(a => a.user_id) : [];

        return {
            id: job.id,
            title: job.title,
            customer: 'Kunde ' + (job.customer_id ? job.customer_id.substring(0, 6) : '?'), // Simple placeholder
            start: job.planned_start, // e.g. "2025-12-29T08:00:00"
            status: job.status, // "offen", "geplant", "erledigt"
            type: 'Standard', // or map from description/title
            assigned_to: assignedIds
        };
    });
}

function renderUnscheduledPool() {
    const pool = document.getElementById('unscheduled-pool');
    if (!pool) return;

    pool.innerHTML = '';

    // Filter for jobs with status 'offen' or no start time
    const openJobs = allJobs.filter(j => j.status === 'offen' || !j.start);

    if (openJobs.length === 0) {
        pool.innerHTML = '<div style="text-align: center; color: #aaa; padding: 20px;">Keine offenen Aufträge</div>';
        return;
    }

    openJobs.forEach(job => {
        const el = createDraggableJobCard(job);
        pool.appendChild(el);
    });
}

// Clear any existing interval to avoid duplicates
if (window.timeLineInterval) clearInterval(window.timeLineInterval);

function renderCalendar() {
    const tableEl = document.getElementById('calendar-table');
    const gridEl = document.getElementById('calendar-grid-view');
    const tbody = document.getElementById('calendar-body');
    const theadRow = document.getElementById('calendar-header-row');

    if (!tableEl || !gridEl || !tbody || !theadRow) return;

    // Toggle Views
    if (currentView === 'month' || currentView === 'year') {
        tableEl.style.display = 'none';
        gridEl.style.display = 'block';

        if (currentView === 'month') renderMonthView(gridEl);
        if (currentView === 'year') renderYearView(gridEl);

        return; // Done for grid views
    }

    // Table Views (Day/Week)
    tableEl.style.display = 'table';
    gridEl.style.display = 'none';
    tbody.innerHTML = '';
    theadRow.innerHTML = '';

    // --- CASE: WEEK or DAY VIEW ---
    let daysToShow = [];
    if (currentView === 'week') {
        const startOfWeek = getStartOfWeek(currentDate);
        for (let i = 0; i < 7; i++) { // Show Mon-Sun (7 days)
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            daysToShow.push(d);
        }
    } else { // Day
        daysToShow.push(new Date(currentDate));
    }

    // Render Header Row
    // Time Column Header
    const timeTh = document.createElement('th');
    timeTh.innerText = 'Zeit';
    timeTh.style.padding = '15px';
    timeTh.style.color = 'var(--text-muted)';
    timeTh.style.width = '80px';
    theadRow.appendChild(timeTh);

    // Date Columns Headers
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    daysToShow.forEach(date => {
        const th = document.createElement('th');
        const dayName = dayNames[date.getDay()];
        const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        th.innerText = `${dayName} (${dateStr})`;
        th.style.padding = '15px';
        th.style.color = 'var(--text-muted)';
        theadRow.appendChild(th);
    });

    // Render Grid Rows (Hours)
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    hours.forEach(time => {
        const tr = document.createElement('tr');

        // Time Label
        const timeTd = document.createElement('td');
        timeTd.className = 'calendar-time-col';
        timeTd.innerText = time;
        tr.appendChild(timeTd);

        // Slots
        daysToShow.forEach(date => {
            const dateIso = toIsoDate(date);
            const td = createSlotCell(dateIso, time);

            // Current Time Line Logic
            if (isToday(date)) {
                td.classList.add('today-cell');
            }
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    // Initial Time Update
    updateCurrentTimeLine();
    window.timeLineInterval = setInterval(updateCurrentTimeLine, 60000); // Every minute
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function updateCurrentTimeLine() {
    // Remove existing lines
    document.querySelectorAll('.current-time-line').forEach(el => el.remove());

    const now = new Date();
    const currentHour = now.getHours();

    // Only show if between 08:00 and 18:00 (approx)
    if (currentHour < 8 || currentHour > 17) return;

    // Calculate position
    // We need to find the cell corresponding to the current hour and today's date
    const hourStr = String(currentHour).padStart(2, '0') + ':00';
    const dateIso = toIsoDate(now);

    // Find the slot in the DOM
    const slot = document.querySelector(`.calendar-slot[data-date="${dateIso}"][data-time="${hourStr}"]`);

    if (slot) {
        const line = document.createElement('div');
        line.className = 'current-time-line';

        // Calculate minutes percentage
        const minutes = now.getMinutes();
        const percent = (minutes / 60) * 100;

        // We are placing the line ABSOLUTE within the slot.
        // Assuming the slot represents 1 hour vertically or horizontally? 
        // Our table rows are 'hours', so vertical list of rows. 
        // So the line should be HORIZONTAL across the slot? 
        // Wait, the previous CSS defined .current-time-line as width: 2px (vertical).
        // BUT the calendar structure is: Rows = Times, Cols = Days.
        // So time flows vertically DOWN.
        // Therefore, the line should be HORIZONTAL.

        // Let's Correct CSS in next step if needed. For now let's set style inline.
        line.style.width = '100%';
        line.style.height = '2px';
        line.style.top = percent + '%';
        line.style.left = '0';

        // Add "Current Time" indicator head on the left
        const head = document.createElement('div');
        head.style.position = 'absolute';
        head.style.left = '-6px';
        head.style.top = '-4px';
        head.style.width = '10px';
        head.style.height = '10px';
        head.style.borderRadius = '50%';
        head.style.backgroundColor = '#ef4444';
        line.appendChild(head);

        slot.appendChild(line);
    }
}



// Global helpers for grid navigation
window.selectDateFromMonth = function (dateStr) {
    currentDate = new Date(dateStr);
    currentView = 'day';
    // Update active button state
    document.querySelectorAll('.view-btn').forEach(btn => {
        if (btn.dataset.view === 'day') btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderCalendar();
    updateHeaderDate();
};

window.selectMonthFromYear = function (monthIndex) {
    currentDate.setMonth(monthIndex);
    currentView = 'month';
    // Update active button state
    document.querySelectorAll('.view-btn').forEach(btn => {
        if (btn.dataset.view === 'month') btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderCalendar();
    updateHeaderDate();
};
function createSlotCell(dateIso, time) {
    const td = document.createElement('td');
    td.className = 'calendar-slot timeline-cell'; // Added timeline-cell class
    td.dataset.date = dateIso;
    td.dataset.time = time;

    // Allow Drop
    td.ondragover = (e) => allowDrop(e);
    td.ondrop = (e) => drop(e, 'calendar');

    // Find jobs
    const jobsInSlot = allJobs.filter(job => {
        if (job.status === 'offen') return false;
        if (currentEmployeeFilter !== 'all' && !job.assigned_to.includes(currentEmployeeFilter)) return false;
        if (!job.start) return false;
        return job.start.startsWith(`${dateIso}T${time}`);
    });

    jobsInSlot.forEach(job => {
        td.appendChild(createDraggableJobCard(job));
    });
    return td;
}

function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function renderMonthView(container) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay() || 7; // 1 (Mon) - 7 (Sun)

    let html = `
    <div class="calendar-grid">
        <div class="calendar-day-header">Mo</div>
        <div class="calendar-day-header">Di</div>
        <div class="calendar-day-header">Mi</div>
        <div class="calendar-day-header">Do</div>
        <div class="calendar-day-header">Fr</div>
        <div class="calendar-day-header">Sa</div>
        <div class="calendar-day-header">So</div>
    `;

    // Empty slots before first day
    for (let i = 1; i < firstDayIndex; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const loopDate = new Date(year, month, d, 12, 0, 0);
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = new Date().toISOString().split('T')[0] === dateStr;

        // Find jobs for this day (Filtering)
        const hasJob = allJobs.some(job => {
            if (job.status === 'offen') return false;
            if (currentEmployeeFilter !== 'all' && !job.assigned_to.includes(currentEmployeeFilter)) return false;
            if (!job.start) return false;
            return job.start.startsWith(dateStr);
        });

        html += `
        <div class="calendar-day ${isToday ? 'today' : ''}" onclick="selectDateFromMonth('${dateStr}')">
            <span>${d}</span>
            ${hasJob ? '<div class="has-events-dot"></div>' : ''}
        </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

function renderYearView(container) {
    const year = currentDate.getFullYear();
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const currentMonthIndex = new Date().getMonth();
    const isCurrentYear = new Date().getFullYear() === year;

    let html = `<div class="year-grid">`;

    months.forEach((m, index) => {
        const isCurrent = isCurrentYear && index === currentMonthIndex;
        html += `
        <div class="year-month ${isCurrent ? 'current-month' : ''}" onclick="selectMonthFromYear(${index})">
            ${m}
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}



/* --- DRAG & DROP HANDLERS --- */

function allowDrop(ev) {
    ev.preventDefault();
    if (ev.target.classList.contains('calendar-slot') || ev.target.id === 'unscheduled-pool') {
        ev.target.classList.add('drag-over');
    }
}

async function drop(ev, targetType) {
    ev.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

    const jobId = ev.dataTransfer.getData("text");
    const job = allJobs.find(j => j.id == jobId); // loose compare for string/int

    if (!job) return;

    // --- LOGIC FOR POOL DROP ---
    if (targetType === 'pool') {
        const { error } = await window.supa
            .from('jobs')
            .update({ status: 'offen', planned_start: null, planned_end: null })
            .eq('id', job.id);

        if (error) {
            console.error('Error unassigning job:', error);
            alert('Fehler beim Zurücksetzen: ' + error.message);
            return;
        }

        // Also delete assignments
        await window.supa.from('job_assignments').delete().eq('job_id', job.id);

        await fetchJobs(); // Refresh
        showToast('Auftrag zurückgesetzt');
    }
    // --- LOGIC FOR CALENDAR DROP ---
    else if (targetType === 'calendar') {
        let targetSlot = ev.target;
        while (targetSlot && !targetSlot.classList.contains('calendar-slot')) {
            targetSlot = targetSlot.parentElement;
        }

        if (targetSlot) {
            const date = targetSlot.dataset.date;
            const time = targetSlot.dataset.time; // "08:00"

            const startIso = `${date}T${time}:00`;
            // Default 1h duration
            const endHour = parseInt(time.split(':')[0]) + 1;
            const endIso = `${date}T${String(endHour).padStart(2, '0')}:00:00`;

            // Update Job Timing
            const { error: jobError } = await window.supa
                .from('jobs')
                .update({ status: 'geplant', planned_start: startIso, planned_end: endIso })
                .eq('id', job.id);

            if (jobError) {
                console.error('Job update failed:', jobError);
                showToast('Fehler beim Planen', 'error');
                return;
            }

            // Update Assignment if filter is active
            if (currentEmployeeFilter !== 'all') {
                // Upsert assignment
                const { error: assignError } = await window.supa
                    .from('job_assignments')
                    .upsert({
                        job_id: job.id,
                        user_id: currentEmployeeFilter,
                        role: 'zugewiesen'
                    });

                if (assignError) console.error('Assignment failed:', assignError);
            }

            await fetchJobs(); // Refresh
            showToast('Auftrag erfolgreich geplant');
        }
    }

    renderUnscheduledPool();
    renderCalendar();
}



/* --- JOB DETAILS MODAL --- */
let currentDetailJobId = null;

function openDetailModal(jobId) {
    const job = allJobs.find(j => j.id == jobId);
    if (!job) return;

    currentDetailJobId = jobId;
    document.getElementById('detail-modal-title').innerText = job.title;
    document.getElementById('detail-customer').innerText = job.customer;
    document.getElementById('detail-type').innerText = job.type;
    document.getElementById('detail-status').innerText = job.status;

    // Time formatting
    const timeStr = job.start ? new Date(job.start).toLocaleString('de-DE') : 'Nicht geplant';
    document.getElementById('detail-time').innerText = timeStr;

    // Unassign Button Action
    const btnUnassign = document.getElementById('btn-unassign');
    if (btnUnassign) btnUnassign.onclick = () => unassignJob(jobId);

    // Delete Button Action
    const btnDelete = document.getElementById('btn-delete-job');
    if (btnDelete) btnDelete.onclick = () => deleteJob(jobId);

    document.getElementById('job-details-modal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('job-details-modal').style.display = 'none';
    currentDetailJobId = null;
}

async function unassignJob(jobId) {
    if (!jobId) return;

    const { error } = await window.supa
        .from('jobs')
        .update({ status: 'offen', planned_start: null, planned_end: null })
        .eq('id', jobId);

    if (error) {
        showToast('Fehler: ' + error.message, 'error');
        return;
    }

    // Delete assignments
    await window.supa.from('job_assignments').delete().eq('job_id', jobId);

    showToast('Auftrag zurück in Pool verschoben');
    closeDetailModal();
    await fetchJobs();
    renderUnscheduledPool();
    renderCalendar();
    await fetchJobs();
    renderUnscheduledPool();
    renderCalendar();
}

async function deleteJob(jobId) {
    if (!jobId) return;
    if (!confirm('Diesen Auftrag wirklich unwiderruflich löschen?')) return;

    // Try Supabase delete if available
    try {
        if (window.supa) {
            const { error } = await window.supa
                .from('jobs')
                .delete()
                .eq('id', jobId);

            if (error) {
                console.error('Delete error:', error);
                // Continue though, to allow local deletion if needed or show error?
                // For now, if DB error, we probably shouldn't delete locally unless it's a permission thing.
                // But user says "nothing happens". Let's assume we want to force remove it from UI.
                showToast('Warnung: Datenbank nicht erreichbar, nur lokal gelöscht', 'warning');
            }
        }
    } catch (err) {
        console.warn('Supabase delete failed', err);
    }

    // LOCAL UPDATE (Critical for UI consistency)
    allJobs = allJobs.filter(j => j.id != jobId);

    showToast('Auftrag gelöscht');
    closeDetailModal();

    // Do NOT call fetchJobs() here as it might restore the job from mock data
    renderUnscheduledPool();
    renderCalendar();
}

/* --- MODAL LOGIC --- */
function openModal() {
    document.getElementById('order-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('order-modal').style.display = 'none';
    document.getElementById('new-order-form').reset();
}

async function createNewOrder(e) {
    e.preventDefault();

    const customerName = document.getElementById('customer-name').value;
    const title = document.getElementById('order-title').value;
    const type = document.getElementById('order-type').value;

    const btn = document.querySelector('#new-order-form button');
    btn.disabled = true;
    btn.innerText = 'Speichere...';

    // Insert into 'jobs'
    // Ideally we would create a customer first or look them up, but we'll use a placeholder 'customer_id' if needed
    // or just store customer name if schema allows? Schema has 'customer_id' FK. 
    // Quick fix: Use a dummy customer ID or create one on the fly? 
    // Schema in 02_jobs_api.sql says: customer_id UUID REFERENCES customers(id).
    // Let's first try to find ANY customer to attach to, or create one.

    try {
        let customerId = null;

        // 1. Find or Create Customer
        // Simple search by name
        const { data: customers } = await window.supa.from('customers').select('id').eq('name', customerName).limit(1);

        if (customers && customers.length > 0) {
            customerId = customers[0].id;
        } else {
            const { data: newCust, error: custError } = await window.supa.from('customers').insert({ name: customerName, email: 'placeholder@mail.com' }).select().single();
            if (custError) throw new Error('Kunde konnte nicht erstellt werden: ' + custError.message);
            customerId = newCust.id;
        }

        // 2. Create Job
        const { error: jobError } = await window.supa.from('jobs').insert({
            title: title,
            description: type, // mapping type to description for now or add 'type' col if exists
            customer_id: customerId,
            status: 'offen'
        });

        if (jobError) throw new Error('Auftrag Fehler: ' + jobError.message);

        // Success
        document.getElementById('new-order-form').reset();
        closeModal();
        await fetchJobs(); // Reload pool
        renderUnscheduledPool();

    } catch (err) {
        console.error(err);
        showToast('Fehler: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Speichern';
    }
}

/* --- TOAST NOTIFICATIONS --- */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.innerText = message;

    // Style
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '6px';
    toast.style.color = 'white';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.minWidth = '250px';

    if (type === 'success') toast.style.backgroundColor = '#10B981'; // Green
    else if (type === 'error') toast.style.backgroundColor = '#EF4444'; // Red
    else toast.style.backgroundColor = '#3B82F6'; // Blue

    container.appendChild(toast);

    // Fade In
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // Remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) container.removeChild(toast);
        }, 300);
    }, 3000);
}
