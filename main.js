const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { disableUsb, enableUsb, usbStatus } = require('./usb');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;
let tray = null;
let quitting = false;
let busy = false;

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

const defaults = {
  auto: true,            // automação ativa
  phase: 'on',           // 'on' = USB ligado | 'off' = USB desligado
  phaseEndsAt: 0,        // timestamp (ms) do fim da fase atual
  onMinutes: 120,        // tempo ligado antes de desligar (2h)
  offMinutes: 90,        // tempo desligado antes de religar (1h30)
  launchAtLogin: true,
  enableOnExit: true,    // religar USB ao fechar o app
  lastError: ''
};

let state = { ...defaults };

function load() {
  try {
    state = { ...defaults, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch { state = { ...defaults }; }
  if (!state.phaseEndsAt) state.phaseEndsAt = Date.now() + state.onMinutes * 60000;
}

function save() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(state, null, 2)); } catch {}
}

function push() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('state', { ...state, now: Date.now(), busy });
  }
  updateTray();
}

function notify(title, body) {
  try { new Notification({ title, body }).show(); } catch {}
}

async function applyPhase(phase, { resetTimer = true } = {}) {
  if (busy) return;
  busy = true;
  push();
  try {
    if (phase === 'off') await disableUsb(); else await enableUsb();
    state.lastError = '';
    notify('USB Timer', phase === 'off'
      ? 'Dispositivos USB de armazenamento DESLIGADOS.'
      : 'Dispositivos USB de armazenamento LIGADOS.');
  } catch (e) {
    state.lastError = 'Falha ao aplicar: ' + e.message + ' (execute como Administrador)';
  }
  state.phase = phase;
  if (resetTimer) {
    const mins = phase === 'on' ? state.onMinutes : state.offMinutes;
    state.phaseEndsAt = Date.now() + mins * 60000;
  }
  busy = false;
  save();
  push();
}

function tick() {
  if (state.auto && !busy && Date.now() >= state.phaseEndsAt) {
    applyPhase(state.phase === 'on' ? 'off' : 'on');
  } else {
    push();
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 720,
    resizable: false,
    title: 'USB Timer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); win.hide(); }
  });
}

function trayIcon() {
  // Ícone simples gerado em memória (quadrado azul 16x16)
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = 0x2b; buf[i * 4 + 1] = 0x7c; buf[i * 4 + 2] = 0xe0; buf[i * 4 + 3] = 0xff;
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function updateTray() {
  if (!tray) return;
  const left = Math.max(0, state.phaseEndsAt - Date.now());
  const m = Math.floor(left / 60000);
  tray.setToolTip(`USB Timer — USB ${state.phase === 'on' ? 'LIGADO' : 'DESLIGADO'}` +
    (state.auto ? ` (muda em ${Math.floor(m / 60)}h ${m % 60}m)` : ' (automação pausada)'));
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir', click: () => { win.show(); win.focus(); } },
    { label: 'Ligar USB agora', click: () => applyPhase('on') },
    { label: 'Desligar USB agora', click: () => applyPhase('off') },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() }
  ]));
  tray.on('double-click', () => { win.show(); win.focus(); });
}

app.whenReady().then(async () => {
  load();
  app.setLoginItemSettings({ openAtLogin: !!state.launchAtLogin });
  createWindow();
  createTray();

  // Sincroniza com o estado real do sistema ao arrancar
  try {
    const real = await usbStatus();
    if (real !== state.phase) {
      // Fase guardada diferente da real: respeita a guardada se ainda não expirou
      if (state.phaseEndsAt > Date.now()) await applyPhase(state.phase, { resetTimer: false });
      else state.phase = real;
    }
  } catch {}

  setInterval(tick, 1000);
  push();
});

app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

app.on('before-quit', async (e) => {
  if (quitting) return;
  e.preventDefault();
  quitting = true;
  if (state.enableOnExit && state.phase === 'off') {
    try { await enableUsb(); } catch {}
  }
  save();
  app.exit(0);
});

ipcMain.handle('get-state', () => ({ ...state, now: Date.now(), busy }));
ipcMain.handle('usb-on', () => applyPhase('on'));
ipcMain.handle('usb-off', () => applyPhase('off'));
ipcMain.handle('toggle-auto', (_e, v) => {
  state.auto = !!v;
  if (state.auto) {
    const mins = state.phase === 'on' ? state.onMinutes : state.offMinutes;
    state.phaseEndsAt = Date.now() + mins * 60000;
  }
  save(); push();
});
ipcMain.handle('restart-cycle', () => {
  const mins = state.phase === 'on' ? state.onMinutes : state.offMinutes;
  state.phaseEndsAt = Date.now() + mins * 60000;
  save(); push();
});
ipcMain.handle('save-settings', (_e, s) => {
  const on = Math.max(1, parseInt(s.onMinutes, 10) || defaults.onMinutes);
  const off = Math.max(1, parseInt(s.offMinutes, 10) || defaults.offMinutes);
  state.onMinutes = on;
  state.offMinutes = off;
  state.launchAtLogin = !!s.launchAtLogin;
  state.enableOnExit = !!s.enableOnExit;
  app.setLoginItemSettings({ openAtLogin: state.launchAtLogin });
  const mins = state.phase === 'on' ? on : off;
  state.phaseEndsAt = Date.now() + mins * 60000;
  save(); push();
});
