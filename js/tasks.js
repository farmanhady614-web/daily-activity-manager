// Tasks Management
async function loadTasks() {
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser?.id || 'default')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading tasks:', error);
        return;
    }
    
    renderTasks(tasks || []);
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
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
            <button class="edit-task" data-task-id="${task.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-task" data-task-id="${task.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const taskItem = e.target.closest('.task-item');
            const taskId = taskItem.dataset.taskId;
            toggleTaskStatus(taskId, e.target.checked);
        });
    });
    
    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            deleteTask(taskId);
        });
    });
}

async function addTask(title, priority, category, dueDate) {
    const { data, error } = await supabase
        .from('tasks')
        .insert([{
            title: title,
            priority: priority,
            category: category,
            due_date: dueDate,
            completed: false,
            user_id: currentUser?.id || 'default',
            created_at: new Date().toISOString()
        }]);
    
    if (error) {
        console.error('Error adding task:', error);
        alert('Gagal menambahkan tugas');
        return false;
    }
    
    await loadTasks();
    await refreshDashboard();
    return true;
}

async function toggleTaskStatus(taskId, completed) {
    const { error } = await supabase
        .from('tasks')
        .update({ completed: completed })
        .eq('id', taskId);
    
    if (error) {
        console.error('Error updating task:', error);
    } else {
        await loadTasks();
        await refreshDashboard();
    }
}

async function deleteTask(taskId) {
    if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) {
            console.error('Error deleting task:', error);
            alert('Gagal menghapus tugas');
        } else {
            await loadTasks();
            await refreshDashboard();
        }
    }
}

function getCategoryIcon(category) {
    const icons = {
        'pekerjaan': '💼',
        'kuliah': '📚',
        'pribadi': '🏠'
    };
    return icons[category] || '📝';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const title = document.getElementById('taskTitle').value;
            const priority = document.getElementById('taskPriority').value;
            const category = document.getElementById('taskCategory').value;
            const dueDate = document.getElementById('taskDueDate').value;
            
            if (!title.trim()) {
                alert('Masukkan nama tugas!');
                return;
            }
            
            addTask(title, priority, category, dueDate);
            
            // Clear form
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskDueDate').value = '';
        });
    }
});