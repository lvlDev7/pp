// mock_data.js
// Simulating the database response based on schema.sql

const mockData = {
    users: [
        { id: 'u1', name: 'Max Mustermann', role: 'handwerker', status: 'aktiv', avatar: 'fas fa-user' },
        { id: 'u2', name: 'Julia Schmidt', role: 'handwerker', status: 'aktiv', avatar: 'fas fa-user-circle' },
        { id: 'u3', name: 'Peter Müller', role: 'handwerker', status: 'krank', avatar: 'fas fa-user-injured' },
        { id: 'u4', name: 'Sarah Connor', role: 'buero', status: 'aktiv', avatar: 'fas fa-user-tie' }
    ],
    jobs: [
        {
            id: 'j1',
            title: 'Müller Badrenovierung',
            customer: 'Fam. Müller',
            type: 'Installation',
            status: 'geplant',
            start: '2025-12-29T08:00',
            end: '2025-12-29T16:00',
            assigned_to: ['u1', 'u2']
        },
        {
            id: 'j2',
            title: 'Wartung Heizung',
            customer: 'Bürokomplex West',
            type: 'Wartung',
            status: 'geplant',
            start: '2025-12-30T09:00',
            end: '2025-12-30T11:00',
            assigned_to: ['u2']
        },
        {
            id: 'j3',
            title: 'Rohrbruch Notdienst',
            customer: 'Kiga Sonnenschein',
            type: 'Reparatur',
            status: 'offen',
            start: '2025-12-29T13:00',
            end: '2025-12-29T15:00',
            assigned_to: []
        },
        {
            id: 'j4',
            title: 'Elektroinstallation Neubau',
            customer: 'Bauprojekt Hafen',
            type: 'Installation',
            status: 'geplant',
            start: '2025-12-31T08:00',
            end: '2025-12-31T17:00',
            assigned_to: ['u1']
        }
    ],
    stats: {
        activeWorkers: 12,
        ordersToday: 8,
        openRequests: 3
    }
};

// Simple export for browser environment (attaching to window)
window.mockData = mockData;
