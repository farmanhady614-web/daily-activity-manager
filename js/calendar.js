// calendar.js - Time Blocking
function loadTimeSlots() {
    const timeSlots = document.getElementById('timeSlots');
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
    
    // Load saved schedules
    loadSavedSchedules();
}

async function loadSavedSchedules() {
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
}

// Calendar Functions
let currentDate = new Date();

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    document.getElementById('currentMonthYear').textContent = 
        `${currentDate.toLocaleString('id-ID', { month: 'long' })} ${year}`;
    
    const calendarGrid = document.getElementById('calendarGrid');
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
}

// pomodoro.js
let timerInterval = null;
let isRunning = false;
let currentSession = 'focus'; // 'focus' or 'break'
let timeLeft = 25 * 60; // 25 minutes in seconds

function initPomodoro() {
    updateTimerDisplay();
    
    document.getElementById('startTimer')?.addEventListener('click', startTimer);
    document.getElementById('pauseTimer')?.addEventListener('click', pauseTimer);
    document.getElementById('resetTimer')?.addEventListener('click', resetTimer);
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            // Timer finished
            clearInterval(timerInterval);
            isRunning = false;
            
            // Switch session
            if (currentSession === 'focus') {
                currentSession = 'break';
                timeLeft = 5 * 60;
                document.getElementById('sessionLabel').textContent = 'Waktu Istirahat';
                alert('Waktu fokus selesai! Ambil istirahat 5 menit.');
            } else {
                currentSession = 'focus';
                timeLeft = 25 * 60;
                document.getElementById('sessionLabel').textContent = 'Waktu Fokus';
                alert('Istirahat selesai! Kembali fokus.');
            }
            updateTimerDisplay();
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
    document.getElementById('sessionLabel').textContent = 'Waktu Fokus';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
}