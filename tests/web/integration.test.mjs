import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.cwd(), 'dist');

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  return 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/tic-tac-toe/')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const relative = url.pathname.replace('/tic-tac-toe/', '') || 'index.html';
    const filePath = path.join(root, relative);
    await stat(filePath);
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(4173, resolve));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} -> ${request.failure()?.errorText}`));

const status = page.locator('#status');

function cell(i) {
  return page.locator(`.cell[data-index="${i}"]`);
}

async function clickMoves(moves) {
  for (const move of moves) {
    await cell(move).click();
  }
}

try {
  await page.goto('http://127.0.0.1:4173/tic-tac-toe/', { waitUntil: 'networkidle' });
  await status.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes("Player X's turn"));

  await clickMoves([0, 3, 1, 4, 2]);
  await expectText(status, 'Player X wins this round!');
  assert.equal(await page.locator('.cell.winner').count(), 3);
  assert.equal(await text('#score-x'), '1');
  assert.equal(await text('#score-o'), '0');
  assert.equal(await text('#score-draws'), '0');

  await page.click('#restart-round');
  await expectText(status, "Player X's turn.");

  await cell(0).click();
  await cell(0).click();
  await expectText(status, "Invalid move. Player O's turn.");

  await clickMoves([1, 2, 4, 3, 5, 7, 6, 8]);
  await expectText(status, 'Round ended in a draw.');
  assert.equal(await text('#score-x'), '1');
  assert.equal(await text('#score-draws'), '1');

  await page.click('#new-match');
  await expectText(status, "Player X's turn.");
  assert.equal(await text('#score-x'), '0');
  assert.equal(await text('#score-o'), '0');
  assert.equal(await text('#score-draws'), '0');

  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join('\n')}`);
  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('\n')}`);
  assert.equal(requestFailures.length, 0, `request failures: ${requestFailures.join('\n')}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

async function text(selector) {
  const value = await page.locator(selector).textContent();
  return value?.trim() ?? '';
}

async function expectText(locator, expected) {
  await page.waitForFunction(
    ([sel, value]) => (document.querySelector(sel)?.textContent || '').trim() === value,
    ['#status', expected]
  );
  assert.equal((await locator.textContent())?.trim(), expected);
}

console.log('web integration tests passed');
