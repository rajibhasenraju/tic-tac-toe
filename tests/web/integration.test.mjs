import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('dist');
const prefix = '/tic-tac-toe/';
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript', '.wasm':'application/wasm' };
const server = createServer(async (req,res) => {
  try {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
    let file = path.resolve(root,decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    const body = await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
let browser;
try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  let wasmLoads = 0;
  page.on('pageerror',error => errors.push(error.message));
  page.on('console',msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('requestfailed',req => errors.push(`${req.url()}: ${req.failure()?.errorText}`));
  page.on('response',res => {
    if (res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`);
    if (res.url().endsWith('/game.wasm') && res.ok()) wasmLoads++;
  });
  const cell = i => page.locator(`.cell[data-index="${i}"]`);
  const text = async selector => (await page.locator(selector).textContent()).trim();
  const status = async expected => {
    await page.waitForFunction(value => document.getElementById('status')?.textContent === value,expected);
    assert.equal(await text('#status'),expected);
  };
  const moves = async values => { for (const i of values) await cell(i).click(); };
  const scores = async () => Promise.all(['x','o','draws'].map(s => text(`#score-${s}`)));
  const ready = () => status("Player X's turn.");
  await page.goto(base,{waitUntil:'networkidle'});
  await ready();
  assert.equal(await page.locator('.cell').count(),9);
  assert.ok(wasmLoads > 0,'actual WASM must load');
  await moves([0,3,1,4,2]);
  await status('Player X wins this round!');
  assert.equal(await page.locator('.winner').count(),3);
  assert.deepEqual(await scores(),['1','0','0']);
  await page.click('#restart-round');
  await ready();
  assert.deepEqual(await scores(),['1','0','0']);
  await cell(0).click(); await cell(0).click();
  await status("Invalid move. Player O's turn.");
  await moves([1,2,4,3,5,7,6,8]);
  await status('Round ended in a draw.');
  assert.deepEqual(await scores(),['1','0','1']);
  await page.click('#new-match'); await ready();
  assert.deepEqual(await scores(),['0','0','0']);
  await moves([0,3,1,4,8,5]);
  await status('Player O wins this round!');
  assert.deepEqual(await scores(),['0','1','0']);

  for (const human of ['1','2']) {
    await page.selectOption('#mode','1');
    await page.selectOption('#side',human);
    for (let turn=0; turn<10; turn++) {
      await page.waitForFunction(() => !document.getElementById('status').textContent.includes('thinking'));
      const current = await text('#status');
      if (current.includes('wins') || current.includes('draw')) break;
      assert.equal(current,`Player ${human === '1' ? 'X' : 'O'}'s turn.`);
      const empty = page.locator('.cell[data-value="0"]:not(:disabled)').first();
      await empty.click();
    }
    await page.waitForFunction(() => /wins|draw/.test(document.getElementById('status').textContent));
    assert.notEqual(await text('#status'),`Player ${human === '1' ? 'X' : 'O'} wins this round!`);
    const terminalScores = await scores();
    assert.equal(terminalScores.map(Number).reduce((a,b)=>a+b,0),1);
    await page.click('#restart-round');
    assert.deepEqual(await scores(),terminalScores);
    await page.click('#new-match');
    assert.deepEqual(await scores(),['0','0','0']);
  }
  // Dispatch synchronously so stale-timer coverage does not depend on runner speed.
  await page.evaluate(() => {
    for (const [id,value] of [['side','2'],['mode','0'],['mode','1'],['mode','0']]) {
      const select=document.getElementById(id); select.value=value; select.dispatchEvent(new Event('change'));
    }
  });
  await page.waitForTimeout(500);
  await ready();
  assert.equal(await page.locator('.cell[data-value="0"]').count(),9);
  await cell(0).focus(); await page.keyboard.press('Enter');
  assert.equal(await cell(0).getAttribute('data-value'),'1');
  for (const width of [390,1000]) {
    await page.setViewportSize({width,height:900});
    const board=await page.locator('#board').boundingBox();
    assert.ok(Math.abs(board.width-board.height)<3,'square board');
    assert.ok(board.width<=width,'board fits viewport');
  }
  await page.selectOption('#theme','dark');
  await page.reload({waitUntil:'networkidle'}); await ready();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.selectOption('#theme','light');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.selectOption('#theme','system');
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.selectOption('#theme','dark');
  await page.locator('.topbar a[href="./docs/"]').click();
  await page.waitForURL('**/docs/');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await page.locator('.docs-content section').count(),10);
  await page.fill('#search','negamax');
  assert.ok(await page.locator('#engine').isVisible());
  assert.equal(await page.locator('#history').isVisible(),false);
  await page.fill('#search','no-such-documentation-term');
  assert.equal(await text('#search-status'),'0 matching sections');
  await page.fill('#search','');
  await page.setViewportSize({width:390,height:844});
  await page.click('#menu');
  assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'true');
  await page.locator('#docs-nav a[href="#engine"]').click();
  assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
  assert.ok(page.url().endsWith('#engine'));
  await page.selectOption('#theme','light');
  await page.locator('.topbar nav a[href="../"]').click();
  await ready();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.emulateMedia({reducedMotion:'reduce'});
  await cell(0).click();
  assert.equal(await cell(0).locator('svg').evaluate(el => getComputedStyle(el).animationName),'none');
  assert.deepEqual(errors,[],'console, page and network errors');
  console.log('Browser/WASM tests passed: local, computer X/O, resets, themes, docs and mobile.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
