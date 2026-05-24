const { ipcRenderer } = require('electron');

let isActivated = false;
let daysRemaining = 0;

// Элементы интерфейса
const elements = {
    activationModal: document.getElementById('activationModal'),
    activationKey: document.getElementById('activationKey'),
    activateBtn: document.getElementById('activateBtn'),
    activationMessage: document.getElementById('activationMessage'),
    activationStatus: document.getElementById('activationStatus'),
    
    projectPath: document.getElementById('projectPath'),
    browseBtn: document.getElementById('browseBtn'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    clearConsole: document.getElementById('clearConsole'),
    
    status: document.getElementById('status'),
    pid: document.getElementById('pid'),
    currentProject: document.getElementById('currentProject'),
    output: document.getElementById('output'),
    
    systemInfo: document.getElementById('systemInfo')
};

// Функции активации
async function checkActivationStatus() {
    const activation = await ipcRenderer.invoke('check-activation');
    isActivated = activation.activated;
    
    if (isActivated) {
        daysRemaining = activation.daysRemaining || 0;
        const statusText = daysRemaining > 0 
            ? `✅ Активирован (осталось ${daysRemaining} дней)`
            : '✅ Активирован';
        
        elements.activationStatus.textContent = statusText;
        elements.activationStatus.className = 'status-badge activated';
        elements.activationModal.style.display = 'none';
        elements.startBtn.disabled = false;
        
        updateFooterInfo();
    } else {
        elements.activationStatus.textContent = '🔴 Не активирован';
        elements.activationStatus.className = 'status-badge';
        elements.activationModal.style.display = 'block';
        elements.startBtn.disabled = true;
    }
}

// Форматирование ключа активации
elements.activationKey.addEventListener('input', function(e) {
    let value = e.target.value.replace(/-/g, '').toUpperCase();
    if (value.length > 16) value = value.substring(0, 16);
    
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += '-';
        }
        formattedValue += value[i];
    }
    
    e.target.value = formattedValue;
});

// Активация продукта
elements.activateBtn.addEventListener('click', async () => {
    const key = elements.activationKey.value.replace(/-/g, '');
    
    if (key.length !== 16) {
        showActivationMessage('Пожалуйста, введите корректный 16-символьный ключ', 'error');
        return;
    }
    
    elements.activateBtn.disabled = true;
    elements.activateBtn.textContent = 'Активация...';
    
    const result = await ipcRenderer.invoke('activate-product', key);
    
    if (result.success) {
        showActivationMessage(result.message, 'success');
        setTimeout(() => {
            checkActivationStatus();
        }, 2000);
    } else {
        showActivationMessage(result.message, 'error');
        elements.activateBtn.disabled = false;
        elements.activateBtn.textContent = 'Активировать';
    }
});

function showActivationMessage(message, type) {
    elements.activationMessage.textContent = message;
    elements.activationMessage.className = `activation-message ${type}`;
}

// Закрытие модального окна
document.querySelector('.close').addEventListener('click', () => {
    if (!isActivated) {
        elements.activationModal.style.display = 'none';
        addToOutput('⚠️ Для запуска проектов требуется активация продукта', 'warning');
    }
});

// Управление проектом
elements.browseBtn.addEventListener('click', async () => {
    if (!isActivated) {
        elements.activationModal.style.display = 'block';
        return;
    }
    
    const result = await ipcRenderer.invoke('select-project-folder');
    if (result.path) {
        elements.projectPath.value = result.path;
        elements.currentProject.textContent = result.path;
        await ipcRenderer.invoke('save-path', result.path);
        addToOutput('📁 Папка проекта выбрана: ' + result.path, 'success');
        elements.startBtn.disabled = false;
    }
});

elements.startBtn.addEventListener('click', async () => {
    const projectDir = elements.projectPath.value;
    if (!projectDir) {
        addToOutput('❌ Сначала выберите папку проекта', 'error');
        return;
    }
    
    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = false;
    
    addToOutput('🚀 Запуск проекта...', 'info');
    
    const result = await ipcRenderer.invoke('start-project', projectDir);
    
    if (result.success) {
        addToOutput('✅ Проект успешно запущен! PID: ' + result.pid, 'success');
        elements.status.textContent = '🟢 Запущен';
        elements.status.className = 'status-running';
        elements.pid.textContent = result.pid;
    } else {
        addToOutput('❌ Ошибка запуска проекта: ' + result.message, 'error');
        elements.startBtn.disabled = false;
        elements.stopBtn.disabled = true;
    }
});

elements.stopBtn.addEventListener('click', async () => {
    addToOutput('⏹️ Остановка проекта...', 'info');
    const result = await ipcRenderer.invoke('stop-project');
    
    if (result.success) {
        addToOutput('✅ Проект успешно остановлен', 'success');
        elements.status.textContent = '🔴 Остановлен';
        elements.status.className = 'status-stopped';
        elements.pid.textContent = '-';
        elements.startBtn.disabled = false;
        elements.stopBtn.disabled = true;
    }
});

elements.clearConsole.addEventListener('click', () => {
    elements.output.innerHTML = '';
    addToOutput('🧹 Консоль очищена', 'info');
});

// Вывод в консоль
function addToOutput(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const messageDiv = document.createElement('div');
    messageDiv.className = `output-line ${type}`;
    messageDiv.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    elements.output.appendChild(messageDiv);
    elements.output.scrollTop = elements.output.scrollHeight;
}

// Информация о системе
function updateFooterInfo() {
    const activationInfo = isActivated && daysRemaining > 0 
        ? ` | ⏰ Осталось ${daysRemaining} дней`
        : '';
    elements.systemInfo.textContent = `🖥️ ${navigator.platform}${activationInfo}`;
}

// Обработчики IPC
ipcRenderer.on('project-output', (event, data) => {
    addToOutput(data.message, data.type);
});

ipcRenderer.on('project-status', (event, data) => {
    if (data.status === 'stopped') {
        elements.status.textContent = '🔴 Остановлен';
        elements.status.className = 'status-stopped';
        elements.pid.textContent = '-';
        elements.startBtn.disabled = false;
        elements.stopBtn.disabled = true;
        addToOutput('⚠️ Процесс проекта завершен', 'warning');
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    updateFooterInfo();
    await checkActivationStatus();
    
    addToOutput('🚀 Rust++ Launcher инициализирован', 'success');
    
    if (isActivated && daysRemaining > 0) {
        addToOutput(`⏰ Активация активна! Осталось ${daysRemaining} дней`, 'success');
    } else if (isActivated) {
        addToOutput('⚠️ Активация активна!', 'warning');
    } else {
        addToOutput('🔐 Пожалуйста, активируйте продукт для продолжения', 'info');
    }
    
    addToOutput('💡 Выберите папку проекта чтобы начать', 'info');
    
    // Загрузка сохраненного пути
    const pathResult = await ipcRenderer.invoke('get-saved-path');
    if (pathResult.path) {
        elements.projectPath.value = pathResult.path;
        elements.currentProject.textContent = pathResult.path;
        elements.startBtn.disabled = !isActivated;
        addToOutput('📁 Загружен предыдущий проект', 'info');
    }
    
    // Проверка статуса проекта
    const statusResult = await ipcRenderer.invoke('get-project-status');
    if (statusResult.status === 'running') {
        elements.status.textContent = '🟢 Запущен';
        elements.status.className = 'status-running';
        elements.pid.textContent = statusResult.pid;
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = false;
        addToOutput('🔍 Найден запущенный процесс проекта', 'info');
    }
});
