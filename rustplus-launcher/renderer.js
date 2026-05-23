const { ipcRenderer } = require('electron');

let currentProjectPath = '';
let autoScroll = true;

const elements = {
    projectPath: document.getElementById('projectPath'),
    projectInfo: document.getElementById('projectInfo'),
    status: document.getElementById('status'),
    logs: document.getElementById('logs'),
    startBtn: document.querySelector('.btn-start'),
    stopBtn: document.querySelector('.btn-stop'),
    clearBtn: document.getElementById('clearPathBtn')
};

// Слушаем сообщения от главного процесса
ipcRenderer.on('project-output', (event, data) => {
    addLog(data.message, data.type);
});

ipcRenderer.on('project-status', (event, data) => {
    updateStatus(data.status);
});

ipcRenderer.on('load-saved-path', (event, savedPath) => {
    if (savedPath) {
        elements.projectPath.value = savedPath;
        checkProject(savedPath);
        addLog(`🔄 Загружен сохраненный путь: ${savedPath}`, 'info');
    }
});

// Загружаем сохраненный путь при запуске
document.addEventListener('DOMContentLoaded', async () => {
    addLog('🚀 Лаунчер запущен', 'info');
    
    // Запрашиваем сохраненный путь
    const savedPath = await ipcRenderer.invoke('get-saved-path');
    if (savedPath.path && await checkProject(savedPath.path)) {
        elements.projectPath.value = savedPath.path;
        addLog(`📁 Автозагрузка: ${savedPath.path}`, 'info');
    } else {
        addLog('ℹ️ Выберите папку с проектом', 'info');
    }
});

async function browseFolder() {
    const result = await ipcRenderer.invoke('select-project-folder');
    if (result.path) {
        elements.projectPath.value = result.path;
        await checkProject(result.path);
    }
}

async function checkProject(projectPath) {
    const packageJsonPath = projectPath + '/package.json';
    
    try {
        const fs = require('fs');
        if (fs.existsSync(packageJsonPath)) {
            // Читаем package.json для информации о проекте
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            elements.projectInfo.innerHTML = `
                <div style="color: green;">
                    ✅ <strong>Проект найден!</strong><br>
                    📦 Название: ${packageJson.name || 'Не указано'}<br>
                    🏷️ Версия: ${packageJson.version || '1.0.0'}<br>
                    📄 Главный файл: ${packageJson.main || 'index.js'}
                </div>
            `;
            
            elements.startBtn.disabled = false;
            currentProjectPath = projectPath;
            
            // Сохраняем путь
            await ipcRenderer.invoke('save-path', projectPath);
            
            updateStatus('stopped');
            return true;
        } else {
            elements.projectInfo.innerHTML = '<span style="color: red;">❌ package.json не найден</span>';
            elements.startBtn.disabled = true;
            currentProjectPath = '';
            return false;
        }
    } catch (error) {
        elements.projectInfo.innerHTML = '<span style="color: red;">❌ Ошибка проверки проекта</span>';
        return false;
    }
}

async function startProject() {
    if (!currentProjectPath) return;
    
    const result = await ipcRenderer.invoke('start-project', currentProjectPath);
    
    if (result.success) {
        addLog('✅ Проект запущен', 'info');
        elements.stopBtn.disabled = false;
        elements.startBtn.disabled = true;
    } else {
        addLog('❌ Ошибка: ' + result.message, 'error');
    }
}

async function stopProject() {
    const result = await ipcRenderer.invoke('stop-project');
    
    if (result.success) {
        addLog('⏹️ Проект остановлен', 'info');
        elements.stopBtn.disabled = true;
        elements.startBtn.disabled = false;
    }
}

async function clearSavedPath() {
    await ipcRenderer.invoke('clear-saved-path');
    elements.projectPath.value = '';
    elements.projectInfo.innerHTML = '';
    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = true;
    currentProjectPath = '';
    addLog('🗑️ Сохраненный путь очищен', 'info');
    updateStatus('unknown');
}

function updateStatus(status) {
    elements.status.className = `status ${status}`;
    const statusText = elements.status.querySelector('.status-text');
    
    switch(status) {
        case 'running':
            statusText.innerHTML = '🟢 <strong>Статус:</strong> Запущен';
            break;
        case 'stopped':
            statusText.innerHTML = '🔴 <strong>Статус:</strong> Остановлен';
            break;
        default:
            statusText.innerHTML = '⚪ <strong>Статус:</strong> Не выбран';
    }
}

function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    let icon = '📝';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = 'ℹ️';
    
    logEntry.innerHTML = `<span style="opacity: 0.7;">[${timestamp}]</span> ${icon} ${message}`;
    
    elements.logs.appendChild(logEntry);
    
    if (autoScroll) {
        elements.logs.scrollTop = elements.logs.scrollHeight;
    }
    
    // Ограничиваем количество логов до 1000
    if (elements.logs.children.length > 1000) {
        elements.logs.removeChild(elements.logs.firstChild);
    }
}

function clearLogs() {
    elements.logs.innerHTML = '<div class="log-entry info">📋 Логи очищены</div>';
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const btn = document.querySelector('.autoscroll-btn');
    btn.textContent = `Автопрокрутка: ${autoScroll ? 'Вкл' : 'Выкл'}`;
    addLog(`Автопрокрутка: ${autoScroll ? 'включена' : 'выключена'}`, 'info');
}
