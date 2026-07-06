#!/usr/bin/env node
'use strict';

/**
 * WAAI Flow — Universal Deployment Script
 * Works on Windows (CMD / PowerShell) and Linux / macOS (Bash)
 * Requirements: Node.js 18+  |  Docker  |  Docker Compose
 */

const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const rl   = require('readline');
const http = require('http');

// ── Platform ────────────────────────────────────────────────────────────────
const IS_WIN   = process.platform === 'win32';
const IS_MAC   = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const ARCH     = os.arch();
const ROOT     = path.resolve(__dirname);

// ── ANSI colours (disabled if not a TTY or NO_COLOR set) ────────────────────
const RAW_ANSI = process.stdout.isTTY && !process.env.NO_COLOR;
// Enable VT sequences on older Windows consoles
if (IS_WIN && RAW_ANSI) {
  try { execSync('reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f', { stdio: 'ignore' }); } catch (_) {}
}

const A = RAW_ANSI ? {
  r:    '\x1b[0m',   b: '\x1b[1m',    d: '\x1b[2m',
  red:  '\x1b[31m',  grn: '\x1b[32m', ylw: '\x1b[33m', blu: '\x1b[34m',
  mag:  '\x1b[35m',  cyn: '\x1b[36m', wht: '\x1b[37m',
  bred: '\x1b[91m',  bgrn: '\x1b[92m', bylw: '\x1b[93m', bblu: '\x1b[94m',
  bmag: '\x1b[95m',  bcyn: '\x1b[96m', bwht: '\x1b[97m',
  hide: '\x1b[?25l', show: '\x1b[?25h',
  up1:  '\x1b[1A',   clr: '\x1b[2K\r',
} : new Proxy({}, { get: () => '' });

// ── Layout ───────────────────────────────────────────────────────────────────
const W = Math.min(process.stdout.columns || 72, 78);

function strip(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }
function pad(s, n) { const len = strip(s).length; return s + ' '.repeat(Math.max(0, n - len)); }
function center(s, w = W - 4) { const len = strip(s).length; const p = Math.max(0, w - len); return ' '.repeat(Math.floor(p / 2)) + s + ' '.repeat(Math.ceil(p / 2)); }

function box(lines, borderColor = A.bcyn, title = '') {
  const inner = W - 4;
  const tBar  = title ? `${borderColor}╔═[ ${A.b}${A.bwht}${title}${A.r}${borderColor} ]${'═'.repeat(Math.max(0, W - 6 - strip(title).length))}╗${A.r}` : `${borderColor}╔${'═'.repeat(W - 2)}╗${A.r}`;
  const bBar  = `${borderColor}╚${'═'.repeat(W - 2)}╝${A.r}`;
  const rows  = lines.map(l => `${borderColor}║${A.r} ${pad(l, inner)} ${borderColor}║${A.r}`);
  return [tBar, ...rows, bBar].join('\n');
}

function divider(label = '', c = A.d) {
  if (!label) return `${c}${'─'.repeat(W)}${A.r}`;
  const side = Math.max(0, Math.floor((W - strip(label).length - 2) / 2));
  return `${c}${'─'.repeat(side)} ${label} ${'─'.repeat(W - side - strip(label).length - 2)}${A.r}`;
}

function print(...args) { process.stdout.write(args.join('') + '\n'); }
function ok(msg)   { print(`  ${A.bgrn}✓${A.r}  ${msg}`); }
function warn(msg) { print(`  ${A.bylw}⚠${A.r}  ${A.ylw}${msg}${A.r}`); }
function fail(msg) { print(`  ${A.bred}✗${A.r}  ${A.red}${msg}${A.r}`); }
function info(msg) { print(`  ${A.bcyn}→${A.r}  ${msg}`); }

// ── Spinner ──────────────────────────────────────────────────────────────────
function spinner(msg) {
  const FRAMES = IS_WIN ? ['|', '/', '-', '\\'] : ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  process.stdout.write(A.hide);
  const id = setInterval(() => {
    process.stdout.write(`${A.clr}  ${A.bcyn}${FRAMES[i++ % FRAMES.length]}${A.r}  ${msg}`);
  }, 80);
  return {
    succeed(done) { clearInterval(id); process.stdout.write(`${A.clr}${A.show}`); ok(done || msg); },
    fail(errMsg)  { clearInterval(id); process.stdout.write(`${A.clr}${A.show}`); fail(errMsg || msg); },
  };
}

// ── Shell helpers ────────────────────────────────────────────────────────────
function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim(); }
  catch { return null; }
}

function runLive(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: IS_WIN, ...opts });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
  });
}

// ── .env helpers ─────────────────────────────────────────────────────────────
function parseEnv(text) {
  const map = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return map;
}

function setEnvKey(file, key, value) {
  let text = fs.readFileSync(file, 'utf8');
  const re  = new RegExp(`^(${key}=).*$`, 'm');
  text = re.test(text) ? text.replace(re, `$1${value}`) : text + `\n${key}=${value}`;
  fs.writeFileSync(file, text, 'utf8');
}

function ask(prompt) {
  const iface = rl.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => iface.question(prompt, ans => { iface.close(); resolve(ans.trim()); }));
}

function secret(prompt) {
  return new Promise(resolve => {
    const iface = rl.createInterface({ input: process.stdin, output: process.stdout });
    iface.question(prompt, ans => { iface.close(); resolve(ans.trim()); });
    // Mask input on POSIX
    if (!IS_WIN && process.stdin.isTTY) {
      try { process.stdin.setRawMode(true); } catch (_) {}
    }
  });
}

// ── Health check ─────────────────────────────────────────────────────────────
function ping(url) {
  return new Promise(resolve => {
    const req = http.get(url, { timeout: 4000 }, res => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Install-guide per OS ─────────────────────────────────────────────────────
function dockerGuide() {
  print('');
  if (IS_WIN) {
    print(box([
      `${A.b}Docker Desktop not found on Windows${A.r}`,
      '',
      `  1. Download from: ${A.bcyn}https://www.docker.com/products/docker-desktop${A.r}`,
      `  2. Install and start Docker Desktop`,
      `  3. Enable  WSL 2 backend  in Docker settings`,
      `  4. Re-run:  ${A.bwht}node deploy.js${A.r}`,
    ], A.bred, 'Action Required'));
  } else if (IS_MAC) {
    print(box([
      `${A.b}Docker Desktop not found on macOS${A.r}`,
      '',
      `  Homebrew:  ${A.bwht}brew install --cask docker${A.r}`,
      `  Manual:    ${A.bcyn}https://www.docker.com/products/docker-desktop${A.r}`,
      '',
      `  Then start Docker Desktop and re-run: ${A.bwht}node deploy.js${A.r}`,
    ], A.bred, 'Action Required'));
  } else {
    print(box([
      `${A.b}Docker not found on Linux${A.r}`,
      '',
      `  Auto-install script (Ubuntu/Debian/Fedora/Arch):`,
      `  ${A.bwht}curl -fsSL https://get.docker.com | sh${A.r}`,
      `  ${A.bwht}sudo usermod -aG docker $USER && newgrp docker${A.r}`,
      '',
      `  Then re-run: ${A.bwht}node deploy.js${A.r}`,
    ], A.bred, 'Action Required'));
  }
  print('');
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════════════
async function main() {
  // ── Banner ────────────────────────────────────────────────────────────────
  print('');
  print(box([
    center(`${A.b}${A.bcyn}██╗    ██╗ █████╗  █████╗ ██╗${A.r}`),
    center(`${A.bcyn}██║    ██║██╔══██╗██╔══██╗██║${A.r}`),
    center(`${A.bcyn}██║ █╗ ██║███████║███████║██║${A.r}`),
    center(`${A.bcyn}██║███╗██║██╔══██║██╔══██║██║${A.r}`),
    center(`${A.bcyn}╚███╔███╔╝██║  ██║██║  ██║██║${A.r}`),
    center(`${A.bcyn} ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ${A.d}Flow${A.r}`),
    '',
    center(`${A.bwht}Open-source WhatsApp AI Automation${A.r}`),
    center(`${A.d}Universal Docker Deployer  •  v1.0${A.r}`),
  ], A.bcyn));
  print('');

  // ── System Info ───────────────────────────────────────────────────────────
  print(divider(`${A.b}${A.bwht} SYSTEM CHECK ${A.r}${A.d}`, A.d));
  print('');

  const platform = IS_WIN ? 'Windows' : IS_MAC ? 'macOS' : 'Linux';
  const nodeVer  = process.version;
  ok(`Platform:   ${A.bwht}${platform}${A.r} ${A.d}(${ARCH})${A.r}`);
  ok(`Node.js:    ${A.bwht}${nodeVer}${A.r}`);

  // ── Docker check ─────────────────────────────────────────────────────────
  const dockerVer = run('docker --version');
  if (!dockerVer) {
    fail(`Docker not found`);
    dockerGuide();
    process.exit(1);
  }
  ok(`Docker:     ${A.bwht}${dockerVer.replace('Docker version ', '').split(',')[0]}${A.r}`);

  // Prefer Compose v2 plugin, fall back to compose v1
  let composeCmd, composeVer;
  const v2 = run('docker compose version');
  if (v2) {
    composeCmd = ['docker', 'compose'];
    composeVer = v2.replace('Docker Compose version ', '');
  } else {
    const v1 = run('docker-compose --version');
    if (!v1) {
      fail('Docker Compose not found');
      print(`\n  ${A.bylw}Install:${A.r} ${A.bwht}pip install docker-compose${A.r}  or update Docker Desktop\n`);
      process.exit(1);
    }
    composeCmd = ['docker-compose'];
    composeVer = v1.replace('docker-compose version ', '').split(',')[0];
  }
  ok(`Compose:    ${A.bwht}${composeVer}${A.r}`);

  // ── Docker daemon running? ────────────────────────────────────────────────
  const daemonUp = run('docker info');
  if (!daemonUp) {
    fail('Docker daemon is not running');
    print(`\n  ${A.bylw}Start Docker Desktop / service and re-run this script.${A.r}\n`);
    process.exit(1);
  }
  ok(`Daemon:     ${A.bwht}running${A.r}`);

  // ── Project root ─────────────────────────────────────────────────────────
  const dcFile = path.join(ROOT, 'docker-compose.yml');
  if (!fs.existsSync(dcFile)) {
    fail(`docker-compose.yml not found in ${ROOT}`);
    process.exit(1);
  }
  ok(`Project:    ${A.bwht}${ROOT}${A.r}`);

  print('');

  // ── .env setup ────────────────────────────────────────────────────────────
  print(divider(`${A.b}${A.bwht} ENVIRONMENT ${A.r}${A.d}`, A.d));
  print('');

  const envFile     = path.join(ROOT, '.env');
  const envExample  = path.join(ROOT, '.env.example');

  let isNewEnv = false;
  if (!fs.existsSync(envFile)) {
    if (!fs.existsSync(envExample)) {
      fail('.env.example not found — cannot auto-create .env');
      process.exit(1);
    }
    fs.copyFileSync(envExample, envFile);
    isNewEnv = true;
    ok(`.env created from .env.example`);
  } else {
    ok(`.env found`);
  }

  const env = parseEnv(fs.readFileSync(envFile, 'utf8'));

  if (isNewEnv || env.ADMIN_PASSWORD === 'changeme' || !env.AUTH_SECRET || env.AUTH_SECRET === 'replace-with-a-long-random-string') {
    print('');
    warn('Default / placeholder secrets detected — please configure them now.');
    print(`  ${A.d}(Press Enter to keep the current value shown in brackets)${A.r}`);
    print('');

    const user = await ask(`  ${A.bwht}Admin username${A.r} [${env.ADMIN_USERNAME || 'admin'}]: `);
    if (user) setEnvKey(envFile, 'ADMIN_USERNAME', user);

    const pw = await ask(`  ${A.bwht}Admin password${A.r} [${env.ADMIN_PASSWORD || 'changeme'}]: `);
    if (pw) setEnvKey(envFile, 'ADMIN_PASSWORD', pw);

    const secret = env.AUTH_SECRET && env.AUTH_SECRET !== 'replace-with-a-long-random-string'
      ? env.AUTH_SECRET
      : require('crypto').randomBytes(32).toString('hex');
    const secretInput = await ask(`  ${A.bwht}Auth secret${A.r} [${secret.slice(0, 16)}… (auto-generated)]: `);
    setEnvKey(envFile, 'AUTH_SECRET', secretInput || secret);

    const aiKey = await ask(`  ${A.bwht}OpenAI API key${A.r} [${env.OPENAI_API_KEY ? '***' + env.OPENAI_API_KEY.slice(-4) : 'skip'}]: `);
    if (aiKey) setEnvKey(envFile, 'OPENAI_API_KEY', aiKey);

    print('');
    ok('.env updated');
  }

  // Show summary (masked)
  const envFinal = parseEnv(fs.readFileSync(envFile, 'utf8'));
  print('');
  print(box([
    `  ${A.d}DATABASE_URL${A.r}    ${A.bwht}${envFinal.DATABASE_URL || 'file:./data/db.sqlite'}${A.r}`,
    `  ${A.d}ADMIN_USERNAME${A.r}  ${A.bwht}${envFinal.ADMIN_USERNAME || 'admin'}${A.r}`,
    `  ${A.d}ADMIN_PASSWORD${A.r}  ${A.bwht}${'*'.repeat(Math.min(envFinal.ADMIN_PASSWORD?.length || 8, 12))}${A.r}`,
    `  ${A.d}AUTH_SECRET${A.r}     ${A.bwht}${(envFinal.AUTH_SECRET || '').slice(0, 10)}…${A.r}`,
    `  ${A.d}PORT${A.r}            ${A.bwht}${envFinal.PORT || '3000'}${A.r}`,
  ], A.d, ' .env summary '));

  print('');

  // ── Confirm ───────────────────────────────────────────────────────────────
  const go = await ask(`  ${A.bwht}Build and start WAAI Flow now? ${A.d}[Y/n]${A.r}: `);
  if (go && !['y', 'yes', ''].includes(go.toLowerCase())) {
    print(`\n  ${A.bylw}Aborted.${A.r}\n`);
    process.exit(0);
  }
  print('');

  // ── Build ─────────────────────────────────────────────────────────────────
  print(divider(`${A.b}${A.bwht} BUILD ${A.r}${A.d}`, A.d));
  print('');
  info(`Running: ${A.bwht}${composeCmd.join(' ')} build${A.r}`);
  print('');

  try {
    await runLive(composeCmd[0], [...composeCmd.slice(1), 'build', '--no-cache'], { cwd: ROOT });
    print('');
    ok('Build complete');
  } catch (e) {
    print('');
    fail(`Build failed — ${e.message}`);
    print(`\n  ${A.bylw}Check the output above for errors, then re-run.${A.r}\n`);
    process.exit(1);
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  print('');
  print(divider(`${A.b}${A.bwht} START ${A.r}${A.d}`, A.d));
  print('');
  info(`Running: ${A.bwht}${composeCmd.join(' ')} up -d${A.r}`);
  print('');

  try {
    await runLive(composeCmd[0], [...composeCmd.slice(1), 'up', '-d'], { cwd: ROOT });
    print('');
    ok('Containers started');
  } catch (e) {
    print('');
    fail(`Startup failed — ${e.message}`);
    print(`\n  ${A.bylw}Try:  ${A.bwht}${composeCmd.join(' ')} logs${A.r}\n`);
    process.exit(1);
  }

  // ── Health check ─────────────────────────────────────────────────────────
  print('');
  print(divider(`${A.b}${A.bwht} HEALTH CHECK ${A.r}${A.d}`, A.d));
  print('');

  const PORT        = envFinal.PORT || '3000';
  const healthUrl   = `http://localhost:${PORT}/api/status`;
  const MAX_TRIES   = 15;
  const DELAY_MS    = 3000;

  const spin = spinner(`Waiting for API at ${A.bcyn}${healthUrl}${A.r} …`);
  let alive = false;

  for (let i = 1; i <= MAX_TRIES; i++) {
    alive = await ping(healthUrl);
    if (alive) break;
    await sleep(DELAY_MS);
  }

  if (alive) {
    spin.succeed(`API is up and responding`);
  } else {
    spin.fail(`API did not respond after ${MAX_TRIES * DELAY_MS / 1000}s`);
    warn('Containers may still be initialising. Check logs:');
    print(`  ${A.bwht}${composeCmd.join(' ')} logs -f${A.r}`);
  }

  // ── Success ───────────────────────────────────────────────────────────────
  print('');
  print(box([
    center(`${A.bgrn}${A.b}🚀  WAAI Flow is running!${A.r}`),
    '',
    `  ${A.d}Frontend${A.r}   ${A.bcyn}http://localhost:${PORT}${A.r}`,
    `  ${A.d}API${A.r}        ${A.bcyn}http://localhost:${PORT}/api${A.r}`,
    `  ${A.d}Health${A.r}     ${A.bcyn}http://localhost:${PORT}/api/status${A.r}`,
    '',
    `  ${A.d}Username${A.r}   ${A.bwht}${envFinal.ADMIN_USERNAME || 'admin'}${A.r}`,
    `  ${A.d}Password${A.r}   ${A.d}(as set in .env)${A.r}`,
    '',
    divider('', A.d),
    '',
    `  ${A.d}View logs${A.r}    ${A.bwht}${composeCmd.join(' ')} logs -f${A.r}`,
    `  ${A.d}Stop${A.r}         ${A.bwht}${composeCmd.join(' ')} down${A.r}`,
    `  ${A.d}Restart${A.r}      ${A.bwht}${composeCmd.join(' ')} restart${A.r}`,
    `  ${A.d}Rebuild${A.r}      ${A.bwht}node deploy.js${A.r}`,
  ], alive ? A.bgrn : A.bylw));

  print('');
  process.exit(alive ? 0 : 1);
}

main().catch(e => {
  process.stdout.write(A.show);
  fail(`Unexpected error: ${e.message}`);
  process.exit(1);
});
