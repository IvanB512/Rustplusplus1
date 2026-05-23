const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let projectProcess = null;
let projectPath = '';

// Функция для работы с настройками
const settingsFile = path.join(__dirname, 'launcher-settings.json');

function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            return settings;
        }
    } catch (error) {
        console.log('Ошибка загрузки настроек:', error);
    }
    return { lastProjectPath: '' };
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.log('Ошибка сохранения настроек:', error);
        return false;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Rust++ Launcher'
    });

    mainWindow.loadFile('index.html');

    // Загружаем сохраненный путь при запуске
    const settings = loadSettings();
    if (settings.lastProjectPath && fs.existsSync(settings.lastProjectPath)) {
        // Даем время окну загрузиться, затем отправляем путь
        setTimeout(() => {
            mainWindow.webContents.send('load-saved-path', settings.lastProjectPath);
        }, 1000);
    }
}

function selectProjectFolder() {
    const result = dialog.showOpenDialogSync(mainWindow, {
        title: 'Выберите папку с проектом Rust++',
        properties: ['openDirectory']
    });
    
    if (result && result[0]) {
        // Сохраняем выбранный путь
        const settings = loadSettings();
        settings.lastProjectPath = result[0];
        saveSettings(settings);
    }
    
    return result ? result[0] : null;
}

function startProject(projectDir) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(projectDir)) {
            reject(new Error('Папка проекта не найдена'));
            return;
        }

        const packageJsonPath = path.join(projectDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            reject(new Error('package.json не найден'));
            return;
        }

        projectPath = projectDir;
        
        // Сохраняем путь при успешном запуске
        const settings = loadSettings();
        settings.lastProjectPath = projectDir;
        saveSettings(settings);

        projectProcess = spawn('npm', ['start'], {
            cwd: projectDir,
            shell: true
        });

        projectProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (mainWindow) {
                mainWindow.webContents.send('project-output', { 
                    type: 'info', 
                    message: message 
                });
            }
        });

        projectProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (mainWindow) {
                mainWindow.webContents.send('project-output', { 
                    type: 'error', 
                    message: message 
                });
            }
        });

        projectProcess.on('close', (code) => {
            if (mainWindow) {
                mainWindow.webContents.send('project-status', { 
                    status: 'stopped' 
                });
            }
            projectProcess = null;
        });

        setTimeout(() => {
            if (projectProcess && !projectProcess.killed) {
                resolve({ 
                    success: true, 
                    pid: projectProcess.pid 
                });
            }
        }, 2000);
    });
}

function stopProject() {
    if (projectProcess) {
        projectProcess.kill();
        projectProcess = null;
        return { success: true };
    }
    return { success: false };
}

// IPC обработчики
ipcMain.handle('select-project-folder', async () => {
    const folder = selectProjectFolder();
    return { path: folder };
});

ipcMain.handle('start-project', async (event, projectDir) => {
    try {
        const result = await startProject(projectDir);
        return { success: true, ...result };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('stop-project', async () => {
    return stopProject();
});

ipcMain.handle('get-project-status', async () => {
    return { 
        status: projectProcess ? 'running' : 'stopped',
        pid: projectProcess ? projectProcess.pid : null
    };
});

ipcMain.handle('get-saved-path', async () => {
    const settings = loadSettings();
    return { path: settings.lastProjectPath || '' };
});

ipcMain.handle('save-path', async (event, projectDir) => {
    const settings = loadSettings();
    settings.lastProjectPath = projectDir;
    const success = saveSettings(settings);
    return { success: success };
});

ipcMain.handle('clear-saved-path', async () => {
    const settings = loadSettings();
    settings.lastProjectPath = '';
    const success = saveSettings(settings);
    return { success: success };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (projectProcess) projectProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
