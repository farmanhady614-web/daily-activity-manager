// Initialize Supabase
const SUPABASE_URL = 'https://yaimzxvzlihtfazznkrz.supabase.co'; // Ganti dengan URL Supabase Anda
const SUPABASE_KEY = 'yaimzxvzlihtfazznkrz'; // Ganti dengan anon key Supabase Anda
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// App State
let currentUser = null;
let currentView = 'dashboard';

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Navigation
function initNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            switchView(viewId);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewId) {
    views.forEach(view => view.classList.remove('active'));
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.add('active');
        currentView = viewId;
        
        // Refresh data when switching views
        if (viewId === 'dashboard') refreshDashboard();
        if (viewId === 'tasks') loadTasks();
        if (viewId === 'schedule') loadTimeSlots();
        if (viewId === 'calendar') renderCalendar();
        if (viewId === 'habits') loadHabits();
        if (viewId === 'journal') loadJournals();
    }
}

// Dashboard Functions
async function refreshDashboard() {
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser?.id || 'default');
    
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.completed)?.length || 0;
    const productivityRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('productivityRate').textContent = `${productivityRate}%`;
    
    // Show recent tasks
    const recentTasks = tasks?.slice(0, 5) || [];
    const recentTasksHtml = recentTasks.map(task => `
        <div class="task-item">
            <div class="task-priority priority-${task.priority}"></div>
            <span class="task-title ${task.completed ? 'completed' : ''}">${task.title}</span>
            <span class="task-category">${task.category}</span>
        </div>
    `).join('');
    
    document.getElementById('recentTasksList').innerHTML = recentTasksHtml || '<p>Belum ada tugas</p>';
}

// Initialize App
async function initApp() {
    initTheme();
    initNavigation();
    
    themeToggle.addEventListener('click', toggleTheme);
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
    } else {
        // For demo, create anonymous user
        currentUser = { id: 'default' };
    }
    
    // Load initial data
    await refreshDashboard();
    await loadTasks();
    await loadTimeSlots();
    renderCalendar();
    initPomodoro();
    await loadHabits();
    await loadJournals();
}

// Start the app
initApp();