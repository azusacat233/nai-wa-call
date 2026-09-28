const { app, BrowserWindow, Menu, protocol, session, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');

const ORIGIN = 'mellow://game';
const ROOT = path.resolve(__dirname, '..', 'app');
const qa = process.env.MELLOW_QA === '1';
if (process.env.MELLOW_USER_DATA) app.setPath('userData', path.resolve(process.env.MELLOW_USER_DATA));
else app.setPath('userData', path.join(app.getPath('appData'), 'MellowFrontline'));
if (qa && process.env.MELLOW_CDP_PORT) app.commandLine.appendSwitch('remote-debugging-port', process.env.MELLOW_CDP_PORT);
app.setName('奶蛙召唤');
protocol.registerSchemesAsPrivileged([{ scheme: 'mellow', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const importmap = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
const hash = createHash('sha256').update(importmap).digest('base64');
const csp = `default-src 'self'; script-src 'self' 'sha256-${hash}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'`;

let win;
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  protocol.handle('mellow', async request => {
    try {
      const url = new URL(request.url);
      if (url.host !== 'game' || !['GET', 'HEAD'].includes(request.method)) return new Response('Forbidden', { status: 403 });
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\\') || pathname.includes('\0')) return new Response('Forbidden', { status: 403 });
      const target = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
      const relative = path.relative(ROOT, target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 });
      const body = await fs.promises.readFile(target);
      return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(contents?.getURL().startsWith(ORIGIN + '/') && ['pointerLock', 'fullscreen'].includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => Boolean(contents?.getURL().startsWith(ORIGIN + '/') && ['pointerLock', 'fullscreen'].includes(permission)));
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !/^(mellow:\/\/game\/|data:|blob:)/.test(details.url) });
  });
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    title: '奶蛙召唤 · CALL OF NAIWA', backgroundColor: '#080d10', show: false,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, backgroundThrottling: false }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== ORIGIN + '/index.html') event.preventDefault(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    if (!qa && (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r'))) event.preventDefault();
  });
  win.on('blur', () => win.webContents.executeJavaScript("if(window.game?.state==='play'&&!game.paused&&!game.dead)game.pause(true)").catch(() => {}));
  for (const [channel, action] of Object.entries({ 'window:quit': () => app.quit(), 'window:fullscreen': () => win.setFullScreen(!win.isFullScreen()) })) {
    ipcMain.handle(channel, event => {
      if (event.sender !== win.webContents || !event.senderFrame.url.startsWith(ORIGIN + '/')) return;
      return action();
    });
  }
  win.once('ready-to-show', () => { if (process.env.MELLOW_HIDDEN !== '1') win.show(); });
  await win.loadURL(ORIGIN + '/index.html');
});
app.on('window-all-closed', () => app.quit());
