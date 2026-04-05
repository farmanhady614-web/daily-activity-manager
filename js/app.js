// Initialize Supabase
const SUPABASE_URL = 'https://yaimzxvzlihtfazznkrz.supabase.co'; // Ganti dengan URL Supabase Anda
const SUPABASE_KEY = '4AF3/jcdr628DaR7vqCzhYMlYIs9JqEwCzk0At5sumScxVIZhMnwUMF+DLb956HjdtyJ13JSVBzqAW2JgTi+7Q=='; // Ganti dengan anon key Supabase Anda
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// STATE MANAGEMENT
// ============================================
let currentUser = null;
let currentView = 'dashboard';
let timerInterval = null;
let isRunning = false;
let currentSession = 'focus';
let timeLeft = 25 * 60;
let currentDate = new Date();

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCategoryIcon(category) {
    const icons = {
        'pekerjaan': '💼',
        'kuliah': '📚',
        'pribadi': '🏠'
    };
    return icons[category] || '📝';
}

// ============================================
// THEME MANAGEMENT
// ============================================
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
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            
            // Update views
            views.forEach(view => view.classList.remove('active'));
            const activeView = document.getElementById(viewId);
            if (activeView) {
                activeView.classList.add('active');
                currentView = viewId;
            }
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Refresh data when switching views
            refreshCurrentView(viewId);
        });
    });
}

function refreshCurrentView(viewId) {
    switch(viewId) {
        case 'dashboard':
            refreshDashboard();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'schedule':
            loadTimeSlots();
            break;
        case 'calendar':
            renderCalendar();
            break;
        case 'habits':
            loadHabits();
            break;
        case 'journal':
            loadJournals();
            break;
    }
}

// ============================================
// DASHBOARD
// ============================================
async function refreshDashboard() {
    try {
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', currentUser?.id || 'default');
        
        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.completed)?.length || 0;
        const productivityRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const totalTasksEl = document.getElementById('totalTasks');
        const completedTasksEl = document.getElementById('completedTasks');
        const productivityRateEl = document.getElementById('productivityRate');
        
        if (totalTasksEl) totalTasksEl.textContent = totalTasks;
        if (completedTasksEl) completedTasksEl.textContent = completedTasks;
        if (productivityRateEl) productivityRateEl.textContent = `${productivityRate}%`;
        
        // Show recent tasks
        const recentTasks = tasks?.slice(0, 5) || [];
        const recentTasksHtml = recentTasks.map(task => `
            <div class="task-item">
                <div class="task-priority priority-${task.priority}"></div>
                <span class="task-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
                <span class="task-category">${getCategoryIcon(task.category)} ${task.category}</span>
            </div>
        `).join('');
        
        const recentTasksList = document.getElementById('recentTasksList');
        if (recentTasksList) {
            recentTasksList.innerHTML = recentTasksHtml || '<p>Belum ada tugas</p>';
        }
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
    }
}

// ============================================
// TASKS MANAGEMENT
// ============================================
async function loadTasks() {
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', currentUser?.id || 'default')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        renderTasks(tasks || []);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center;">Belum ada tugas. Tambahkan tugas baru!</p>';
        return;
    }
    
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item" data-task-id="${task.id}">
            <div class="task-priority priority-${task.priority}"></div>
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
            <span class="task-category">${getCategoryIcon(task.category)} ${task.category}</span>
            <span class="task-date">${task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}</span>
            <button class="delete-task" data-task-id="${task.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const taskItem = e.target.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;
            if (taskId) toggleTaskStatus(taskId, e.target.checked);
        });
    });
    
    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            if (taskId) deleteTask(taskId);
        });
    });
}

async function addTask(title, priority, category, dueDate) {
    try {
        const { error } = await supabase
            .from('tasks')
            .insert([{
                title: title,
                priority: priority,
                category: category,
                due_date: dueDate || null,
                completed: false,
                user_id: currentUser?.id || 'default',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        await loadTasks();
        await refreshDashboard();
        return true;
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Gagal menambahkan tugas');
        return false;
    }
}

async function toggleTaskStatus(taskId, completed) {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({ completed: completed })
            .eq('id', taskId);
        
        if (error) throw error;
        
        await loadTasks();
        await refreshDashboard();
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    
    try {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) throw error;
        
        await loadTasks();
        await refreshDashboard();
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Gagal menghapus tugas');
    }
}

// ============================================
// TIME BLOCKING
// ============================================
function loadTimeSlots() {
    const timeSlots = document.getElementById('timeSlots');
    if (!timeSlots) return;
    
    const hours = [];
    for (let i = 6; i <= 22; i++) {
        const period = i < 12 ? 'AM' : 'PM';
        const displayHour = i > 12 ? i - 12 : i;
        hours.push(`${displayHour}:00 ${period}`);
    }
    
    timeSlots.innerHTML = hours.map(hour => `
        <div class="time-slot">
            <div class="time-label">${hour}</div>
            <input type="text" placeholder="Aktivitas..." class="slot-activity" data-time="${hour}">
            <button class="save-slot btn-secondary" data-time="${hour}">Simpan</button>
        </div>
    `).join('');
    
    // Add save listeners
    document.querySelectorAll('.save-slot').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const time = e.currentTarget.dataset.time;
            const input = document.querySelector(`.slot-activity[data-time="${time}"]`);
            const activity = input?.value || '';
            await saveTimeSlot(time, activity);
        });
    });
    
    loadSavedSchedules();
}

async function saveTimeSlot(time, activity) {
    try {
        const { error } = await supabase
            .from('time_slots')
            .upsert([{
                user_id: currentUser?.id || 'default',
                date: new Date().toDateString(),
                time: time,
                activity: activity,
                created_at: new Date().toISOString()
            }], {
                onConflict: 'user_id,date,time'
            });
        
        if (error) throw error;
        alert('Jadwal tersimpan!');
    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Gagal menyimpan jadwal');
    }
}

async function loadSavedSchedules() {
    try {
        const { data: schedules } = await supabase
            .from('time_slots')
            .select('*')
            .eq('user_id', currentUser?.id || 'default')
            .eq('date', new Date().toDateString());
        
        if (schedules) {
            schedules.forEach(schedule => {
                const input = document.querySelector(`.slot-activity[data-time="${schedule.time}"]`);
                if (input) input.value = schedule.activity;
            });
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
    }
}

// ============================================
// CALENDAR
// ============================================
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const monthYearEl = document.getElementById('currentMonthYear');
    if (monthYearEl) {
        monthYearEl.textContent = `${currentDate.toLocaleString('id-ID', { month: 'long' })} ${year}`;
    }
    
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    // Day headers
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.padding = '0.5rem';
        calendarGrid.appendChild(dayHeader);
    });
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    // Calendar days
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayCell.addEventListener('click', () => showTasksForDate(dateStr));
        
        calendarGrid.appendChild(dayCell);
    }
}

async function showTasksForDate(date) {
    try {
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', currentUser?.id || 'default')
            .eq('due_date', date);
        
        if (tasks && tasks.length > 0) {
            alert(`Tugas untuk ${date}:\n${tasks.map(t => `- ${t.title}`).join('\n')}`);
        } else {
            alert(`Tidak ada tugas untuk tanggal ${date}`);
        }
    } catch (error) {
        console.error('Error loading tasks for date:', error);
    }
}

// ============================================
// POMODORO TIMER
// ============================================
function initPomodoro() {
    updateTimerDisplay();
    
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    const resetBtn = document.getElementById('resetTimer');
    
    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            
            if (currentSession === 'focus') {
                currentSession = 'break';
                timeLeft = 5 * 60;
                const sessionLabel = document.getElementById('sessionLabel');
                if (sessionLabel) sessionLabel.textContent = 'Waktu Istirahat';
                alert('Waktu fokus selesai! Ambil istirahat 5 menit.');
            } else {
                currentSession = 'focus';
                timeLeft = 25 * 60;
                const sessionLabel = document.getElementById('sessionLabel');
                if (sessionLabel) sessionLabel.textContent = 'Waktu Fokus';
                alert('Istirahat selesai! Kembali fokus.');
            }
            updateTimerDisplay();
            startTimer();
        }
    }, 1000);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        isRunning = false;
    }
}

function resetTimer() {
    pauseTimer();
    currentSession = 'focus';
    timeLeft = 25 * 60;
    const sessionLabel = document.getElementById('sessionLabel');
    if (sessionLabel) sessionLabel.textContent = 'Waktu Fokus';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.textContent = display;
}

// ============================================
// HABITS TRACKER
// ============================================
async function loadHabits() {
    try {
        const { data: habits } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', currentUser?.id || 'default');
        
        renderHabits(habits || []);
    } catch (error) {
        console.error('Error loading habits:', error);
    }
}

function renderHabits(habits) {
    const habitsList = document.getElementById('habitsList');
    if (!habitsList) return;
    
    const today = new Date().toDateString();
    
    if (habits.length === 0) {
        habitsList.innerHTML = '<p style="text-align: center;">Belum ada kebiasaan. Tambahkan kebiasaan baru!</p>';
        return;
    }
    
    habitsList.innerHTML = habits.map(habit => {
        const completedDates = habit.completed_dates || [];
        const isCompletedToday = completedDates.includes(today);
        
        return `
            <div class="habit-item">
                <input type="checkbox" class="habit-checkbox" 
                    data-habit-id="${habit.id}"
                    ${isCompletedToday ? 'checked' : ''}>
                <span class="habit-name ${isCompletedToday ? 'completed' : ''}">${escapeHtml(habit.name)}</span>
                <span class="habit-streak">🔥 Streak: ${habit.streak || 0} hari</span>
                <button class="delete-habit" data-habit-id="${habit.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    document.querySelectorAll('.habit-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const habitId = e.currentTarget.dataset.habitId;
            if (habitId) await toggleHabit(habitId, e.target.checked);
        });
    });
    
    document.querySelectorAll('.delete-habit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const habitId = e.currentTarget.dataset.habitId;
            if (habitId) await deleteHabit(habitId);
        });
    });
}

async function addHabit(name) {
    try {
        const { error } = await supabase
            .from('habits')
            .insert([{
                name: name,
                user_id: currentUser?.id || 'default',
                completed_dates: [],
                streak: 0,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        await loadHabits();
    } catch (error) {
        console.error('Error adding habit:', error);
        alert('Gagal menambahkan kebiasaan');
    }
}

async function toggleHabit(habitId, completed) {
    try {
        const { data: habit } = await supabase
            .from('habits')
            .select('*')
            .eq('id', habitId)
            .single();
        
        if (habit) {
            const today = new Date().toDateString();
            let completedDates = habit.completed_dates || [];
            let streak = habit.streak || 0;
            
            if (completed && !completedDates.includes(today)) {
                completedDates.push(today);
                streak++;
            } else if (!completed) {
                completedDates = completedDates.filter(date => date !== today);
                streak = Math.max(0, streak - 1);
            }
            
            await supabase
                .from('habits')
                .update({ completed_dates: completedDates, streak: streak })
                .eq('id', habitId);
            
            await loadHabits();
        }
    } catch (error) {
        console.error('Error toggling habit:', error);
    }
}

async function deleteHabit(habitId) {
    if (!confirm('Hapus kebiasaan ini?')) return;
    
    try {
        await supabase.from('habits').delete().eq('id', habitId);
        await loadHabits();
    } catch (error) {
        console.error('Error deleting habit:', error);
        alert('Gagal menghapus kebiasaan');
    }
}

// ============================================
// JOURNAL
// ============================================
async function saveJournal() {
    const content = document.getElementById('journalEntry')?.value;
    if (!content?.trim()) {
        alert('Tulis refleksi harian Anda terlebih dahulu!');
        return;
    }
    
    const today = new Date().toDateString();
    
    try {
        const { error } = await supabase
            .from('journals')
            .upsert([{
                user_id: currentUser?.id || 'default',
                date: today,
                content: content,
                updated_at: new Date().toISOString()
            }], {
                onConflict: 'user_id,date'
            });
        
        if (error) throw error;
        
        alert('Jurnal berhasil disimpan!');
        await loadJournals();
    } catch (error) {
        console.error('Error saving journal:', error);
        alert('Gagal menyimpan jurnal');
    }
}

async function loadJournals() {
    try {
        const { data: journals } = await supabase
            .from('journals')
            .select('*')
            .eq('user_id', currentUser?.id || 'default')
            .order('date', { ascending: false });
        
        const previousJournals = document.getElementById('previousJournals');
        if (!previousJournals) return;
        
        if (journals && journals.length > 0) {
            previousJournals.innerHTML = `
                <h3>Jurnal Sebelumnya</h3>
                ${journals.map(journal => `
                    <div class="journal-item" style="background: var(--bg-secondary); padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px;">
                        <strong>${new Date(journal.date).toLocaleDateString('id-ID')}</strong>
                        <p>${escapeHtml(journal.content.substring(0, 200))}${journal.content.length > 200 ? '...' : ''}</p>
                        <button class="view-journal btn-secondary" data-date="${journal.date}">Lihat Lengkap</button>
                    </div>
                `).join('')}
            `;
            
            document.querySelectorAll('.view-journal').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const date = e.currentTarget.dataset.date;
                    const { data: journal } = await supabase
                        .from('journals')
                        .select('*')
                        .eq('user_id', currentUser?.id || 'default')
                        .eq('date', date)
                        .single();
                    
                    if (journal) {
                        alert(`Jurnal ${date}:\n\n${journal.content}`);
                    }
                });
            });
        } else {
            previousJournals.innerHTML = '<p>Belum ada jurnal tersimpan</p>';
        }
    } catch (error) {
        console.error('Error loading journals:', error);
    }
}

// ============================================
// INITIALIZATION
// ============================================
async function initApp() {
    console.log('Initializing app...');
    
    // Initialize theme
    initTheme();
    
    // Set current user (for demo without auth)
    currentUser = { id: 'default' };
    
    // Setup navigation
    initNavigation();
    
    // Setup theme toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Setup task form
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const title = document.getElementById('taskTitle')?.value;
            const priority = document.getElementById('taskPriority')?.value;
            const category = document.getElementById('taskCategory')?.value;
            const dueDate = document.getElementById('taskDueDate')?.value;
            
            if (!title?.trim()) {
                alert('Masukkan nama tugas!');
                return;
            }
            
            addTask(title, priority, category, dueDate);
            
            // Clear form
            const taskTitleInput = document.getElementById('taskTitle');
            const taskDueDateInput = document.getElementById('taskDueDate');
            if (taskTitleInput) taskTitleInput.value = '';
            if (taskDueDateInput) taskDueDateInput.value = '';
        });
    }
    
    // Setup habit form
    const addHabitBtn = document.getElementById('addHabitBtn');
    if (addHabitBtn) {
        addHabitBtn.addEventListener('click', () => {
            const habitName = document.getElementById('habitName')?.value;
            if (habitName?.trim()) {
                addHabit(habitName);
                const habitNameInput = document.getElementById('habitName');
                if (habitNameInput) habitNameInput.value = '';
            }
        });
    }
    
    // Setup journal form
    const saveJournalBtn = document.getElementById('saveJournalBtn');
    if (saveJournalBtn) {
        saveJournalBtn.addEventListener('click', saveJournal);
    }
    
    // Setup calendar navigation
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // Initialize Pomodoro
    initPomodoro();
    
    // Load initial data
    await refreshDashboard();
    await loadTasks();
    loadTimeSlots();
    renderCalendar();
    await loadHabits();
    await loadJournals();
    
    console.log('App initialized successfully!');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}