// habits.js
async function loadHabits() {
    const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', currentUser?.id || 'default');
    
    renderHabits(habits || []);
}

function renderHabits(habits) {
    const habitsList = document.getElementById('habitsList');
    const today = new Date().toDateString();
    
    habitsList.innerHTML = habits.map(habit => {
        const isCompletedToday = habit.completed_dates?.includes(today);
        
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
        checkbox.addEventListener('change', (e) => {
            const habitId = e.currentTarget.dataset.habitId;
            toggleHabit(habitId, e.target.checked);
        });
    });
    
    document.querySelectorAll('.delete-habit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const habitId = e.currentTarget.dataset.habitId;
            deleteHabit(habitId);
        });
    });
}

async function addHabit(name) {
    const { error } = await supabase
        .from('habits')
        .insert([{
            name: name,
            user_id: currentUser?.id || 'default',
            completed_dates: [],
            streak: 0,
            created_at: new Date().toISOString()
        }]);
    
    if (error) {
        alert('Gagal menambahkan kebiasaan');
    } else {
        await loadHabits();
    }
}

async function toggleHabit(habitId, completed) {
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
            streak--;
        }
        
        await supabase
            .from('habits')
            .update({ completed_dates: completedDates, streak: streak })
            .eq('id', habitId);
        
        await loadHabits();
    }
}

async function deleteHabit(habitId) {
    if (confirm('Hapus kebiasaan ini?')) {
        await supabase.from('habits').delete().eq('id', habitId);
        await loadHabits();
    }
}

document.getElementById('addHabitBtn')?.addEventListener('click', () => {
    const habitName = document.getElementById('habitName').value;
    if (habitName.trim()) {
        addHabit(habitName);
        document.getElementById('habitName').value = '';
    }
});

// journal.js
async function saveJournal() {
    const content = document.getElementById('journalEntry').value;
    const today = new Date().toDateString();
    
    if (!content.trim()) {
        alert('Tulis refleksi harian Anda terlebih dahulu!');
        return;
    }
    
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
    
    if (error) {
        alert('Gagal menyimpan jurnal');
    } else {
        alert('Jurnal berhasil disimpan!');
        await loadJournals();
    }
}

async function loadJournals() {
    const { data: journals } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', currentUser?.id || 'default')
        .order('date', { ascending: false });
    
    const previousJournals = document.getElementById('previousJournals');
    
    if (journals && journals.length > 0) {
        previousJournals.innerHTML = `
            <h3>Jurnal Sebelumnya</h3>
            ${journals.map(journal => `
                <div class="journal-item">
                    <strong>${new Date(journal.date).toLocaleDateString('id-ID')}</strong>
                    <p>${escapeHtml(journal.content.substring(0, 200))}${journal.content.length > 200 ? '...' : ''}</p>
                    <button class="view-journal" data-date="${journal.date}">Lihat Lengkap</button>
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
}

document.getElementById('saveJournalBtn')?.addEventListener('click', saveJournal);