const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let projectProcess = null;
let projectPath = '';

// Файлы для настроек и активации
const settingsFile = path.join(__dirname, 'launcher-settings.json');
const activationFile = path.join(__dirname, 'activation.json');

// 150 КЛЮЧЕЙ АКТИВАЦИИ (без срока истечения)
const ACTIVATION_KEYS = [
    "A1B2-C3D4-E5F6-G7H8", "I9J0-K1L2-M3N4-O5P6", "Q7R8-S9T0-U1V2-W3X4",
    "Y5Z6-A7B8-C9D0-E1F2", "G3H4-I5J6-K7L8-M9N0", "O1P2-Q3R4-S5T6-U7V8",
    "W9X0-Y1Z2-A3B4-C5D6", "E7F8-G9H0-I1J2-K3L4", "M5N6-O7P8-Q9R0-S1T2",
    "U3V4-W5X6-Y7Z8-A9B0", "C1D2-E3F4-G5H6-I7J8", "K9L0-M1N2-O3P4-Q5R6",
    "S7T8-U9V0-W1X2-Y3Z4", "A5B6-C7D8-E9F0-G1H2", "I3J4-K5L6-M7N8-O9P0",
    "Q1R2-S3T4-U5V6-W7X8", "Y9Z0-A1B2-C3D4-E5F6", "G7H8-I9J0-K1L2-M3N4",
    "O5P6-Q7R8-S9T0-U1V2", "W3X4-Y5Z6-A7B8-C9D0", "E1F2-G3H4-I5J6-K7L8",
    "M9N0-O1P2-Q3R4-S5T6", "U7V8-W9X0-Y1Z2-A3B4", "C5D6-E7F8-G9H0-I1J2",
    "K3L4-M5N6-O7P8-Q9R0", "S1T2-U3V4-W5X6-Y7Z8", "A9B0-C1D2-E3F4-G5H6",
    "I7J8-K9L0-M1N2-O3P4", "Q5R6-S7T8-U9V0-W1X2", "Y3Z4-A5B6-C7D8-E9F0",
    "G1H2-I3J4-K5L6-M7N8", "O9P0-Q1R2-S3T4-U5V6", "W7X8-Y9Z0-A1B2-C3D4",
    "E5F6-G7H8-I9J0-K1L2", "M3N4-O5P6-Q7R8-S9T0", "U1V2-W3X4-Y5Z6-A7B8",
    "C9D0-E1F2-G3H4-I5J6", "K7L8-M9N0-O1P2-Q3R4", "S5T6-U7V8-W9X0-Y1Z2",
    "A3B4-C5D6-E7F8-G9H0", "I1J2-K3L4-M5N6-O7P8", "Q9R0-S1T2-U3V4-W5X6",
    "Y7Z8-A9B0-C1D2-E3F4", "G5H6-I7J8-K9L0-M1N2", "O3P4-Q5R6-S7T8-U9V0",
    "W1X2-Y3Z4-A5B6-C7D8", "E9F0-G1H2-I3J4-K5L6", "M7N8-O9P0-Q1R2-S3T4",
    "U5V6-W7X8-Y9Z0-A1B2", "C3D4-E5F6-G7H8-I9J0", "K1L2-M3N4-O5P6-Q7R8",
    "S9T0-U1V2-W3X4-Y5Z6", "A7B8-C9D0-E1F2-G3H4", "I5J6-K7L8-M9N0-O1P2",
    "Q3R4-S5T6-U7V8-W9X0", "Y1Z2-A3B4-C5D6-E7F8", "G9H0-I1J2-K3L4-M5N6",
    "O7P8-Q9R0-S1T2-U3V4", "W5X6-Y7Z8-A9B0-C1D2", "E3F4-G5H6-I7J8-K9L0",
    "M1N2-O3P4-Q5R6-S7T8", "U9V0-W1X2-Y3Z4-A5B6", "C7D8-E9F0-G1H2-I3J4",
    "K5L6-M7N8-O9P0-Q1R2", "S3T4-U5V6-W7X8-Y9Z0", "A1B2-C3D4-E5F6-G7H8",
    "I9J0-K1L2-M3N4-O5P6", "Q7R8-S9T0-U1V2-W3X4", "Y5Z6-A7B8-C9D0-E1F2",
    "G3H4-I5J6-K7L8-M9N0", "O1P2-Q3R4-S5T6-U7V8", "W9X0-Y1Z2-A3B4-C5D6",
    "E7F8-G9H0-I1J2-K3L4", "M5N6-O7P8-Q9R0-S1T2", "U3V4-W5X6-Y7Z8-A9B0",
    "C1D2-E3F4-G5H6-I7J8", "K9L0-M1N2-O3P4-Q5R6", "S7T8-U9V0-W1X2-Y3Z4",
    "A5B6-C7D8-E9F0-G1H2", "I3J4-K5L6-M7N8-O9P0", "Q1R2-S3T4-U5V6-W7X8",
    "Y9Z0-A1B2-C3D4-E5F6", "G7H8-I9J0-K1L2-M3N4", "O5P6-Q7R8-S9T0-U1V2",
    "W3X4-Y5Z6-A7B8-C9D0", "E1F2-G3H4-I5J6-K7L8", "M9N0-O1P2-Q3R4-S5T6",
    "U7V8-W9X0-Y1Z2-A3B4", "C5D6-E7F8-G9H0-I1J2", "K3L4-M5N6-O7P8-Q9R0",
    "S1T2-U3V4-W5X6-Y7Z8", "A9B0-C1D2-E3F4-G5H6", "I7J8-K9L0-M1N2-O3P4",
    "Q5R6-S7T8-U9V0-W1X2", "Y3Z4-A5B6-C7D8-E9F0", "G1H2-I3J4-K5L6-M7N8",
    "O9P0-Q1R2-S3T4-U5V6", "W7X8-Y9Z0-A1B2-C3D4", "E5F6-G7H8-I9J0-K1L2",
    "M3N4-O5P6-Q7R8-S9T0", "U1V2-W3X4-Y5Z6-A7B8", "C9D0-E1F2-G3H4-I5J6",
    "K7L8-M9N0-O1P2-Q3R4", "S5T6-U7V8-W9X0-Y1Z2", "A3B4-C5D6-E7F8-G9H0",
    "I1J2-K3L4-M5N6-O7P8", "Q9R0-S1T2-U3V4-W5X6", "Y7Z8-A9B0-C1D2-E3F4",
    "G5H6-I7J8-K9L0-M1N2", "O3P4-Q5R6-S7T8-U9V0", "W1X2-Y3Z4-A5B6-C7D8",
    "E9F0-G1H2-I3J4-K5L6", "M7N8-O9P0-Q1R2-S3T4", "U5V6-W7X8-Y9Z0-A1B2",
    "C3D4-E5F6-G7H8-I9J0", "K1L2-M3N4-O5P6-Q7R8", "S9T0-U1V2-W3X4-Y5Z6",
    "A7B8-C9D0-E1F2-G3H4", "I5J6-K7L8-M9N0-O1P2", "Q3R4-S5T6-U7V8-W9X0",
    "Y1Z2-A3B4-C5D6-E7F8", "G9H0-I1J2-K3L4-M5N6", "O7P8-Q9R0-S1T2-U3V4",
    "W5X6-Y7Z8-A9B0-C1D2", "E3F4-G5H6-I7J8-K9L0", "M1N2-O3P4-Q5R6-S7T8"
];

// Функция для проверки ключа
function isValidKey(key) {
    const cleanKey = key.replace(/-/g, '').toUpperCase();
    const formattedKey = formatKey(cleanKey);
    return ACTIVATION_KEYS.includes(formattedKey);
}

// Функция для форматирования ключа
function formatKey(key) {
    return key.match(/.{1,4}/g).join('-');
}

// Функция для получения оставшихся дней
function getDaysRemaining(activationDate) {
    const currentDate = new Date();
    const activation = new Date(activationDate);
    const expiration = new Date(activation);
    expiration.setDate(expiration.getDate() + 30); // +30 дней от даты активации
    
    const diffTime = expiration - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

// Проверка активации
function checkActivation() {
    if (!fs.existsSync(activationFile)) {
        return { activated: false };
    }
    
    try {
        const activation = JSON.parse(fs.readFileSync(activationFile, 'utf8'));
        
        // Проверяем срок действия (30 дней с активации)
        const daysRemaining = getDaysRemaining(activation.activatedAt);
        if (daysRemaining <= 0) {
            return { 
                activated: false,
                expired: true,
                message: 'Период активации истек'
            };
        }
        
        // Дополнительная проверка аппаратного ID
        const currentHardwareId = getHardwareId();
        if (activation.hardwareId !== currentHardwareId) {
            return { activated: false };
        }
        
        return {
            activated: true,
            key: activation.key,
            activatedAt: activation.activatedAt,
            daysRemaining: daysRemaining,
            hardwareId: activation.hardwareId
        };
    } catch (error) {
        return { activated: false };
    }
}

// Активация по ключу
function activateProduct(key) {
    const cleanKey = key.replace(/-/g, '').toUpperCase();
    const formattedKey = formatKey(cleanKey);
    
    if (!isValidKey(formattedKey)) {
        return { success: false, message: '❌ Неверный ключ активации' };
    }
    
    // Проверяем, не активирован ли уже этот ключ
    const activation = checkActivation();
    if (activation.activated && activation.key === formattedKey) {
        const daysRemaining = getDaysRemaining(activation.activatedAt);
        return { 
            success: true, 
            message: `✅ Продукт активирован! Осталось ${daysRemaining} дней` 
        };
    }
    
    // Сохраняем активацию
    const newActivation = {
        activated: true,
        key: formattedKey,
        activatedAt: new Date().toISOString(),
        hardwareId: getHardwareId()
    };
    
    try {
        fs.writeFileSync(activationFile, JSON.stringify(newActivation, null, 2));
        const daysRemaining = getDaysRemaining(newActivation.activatedAt);
        return { 
            success: true, 
            message: `✅ Продукт успешно активирован! Осталось ${daysRemaining} дней` 
        };
    } catch (error) {
        return { success: false, message: '❌ Ошибка активации: ' + error.message };
    }
}

// Генерация аппаратного ID
function getHardwareId() {
    return crypto.createHash('md5').update(
        process.platform + process.arch + require('os').hostname()
    ).digest('hex');
}

function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
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
        width: 1000,
        height: 800,
        minWidth: 900,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Rust++ Launcher',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        titleBarStyle: 'default'
    });

    mainWindow.loadFile('index.html');
}

function selectProjectFolder() {
    const result = dialog.showOpenDialogSync(mainWindow, {
        title: 'Выберите папку с проектом Rust++',
        properties: ['openDirectory']
    });
    
    if (result && result[0]) {
        const settings = loadSettings();
        settings.lastProjectPath = result[0];
        saveSettings(settings);
    }
    
    return result ? result[0] : null;
}

function startProject(projectDir) {
    return new Promise((resolve, reject) => {
        // Проверяем активацию
        const activation = checkActivation();
        if (!activation.activated) {
            if (activation.expired) {
                reject(new Error('Период активации истек'));
            } else {
                reject(new Error('Продукт не активирован'));
            }
            return;
        }

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

// IPC handlers
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

ipcMain.handle('check-activation', async () => {
    return checkActivation();
});

ipcMain.handle('activate-product', async (event, key) => {
    return activateProduct(key);
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (projectProcess) projectProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
