import { chromium } from 'playwright';
const SP = process.env.SP;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://localhost:5199/#/costing');
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForSelector('.app-nav');
await p.fill('#product-name', 'Contrast Set in Beige & White');
await p.fill('#product-code', 'Lace-01');
await p.fill('#quantity-produced', '100');
await p.setInputFiles('input[aria-label="Product photo file"]', SP + '/portrait.png');
await p.waitForSelector('.photo-preview');

const box = await p.locator('.photo-preview').boundingBox();
const nat = await p.locator('.photo-preview').evaluate(el => ({ w: el.naturalWidth, h: el.naturalHeight }));
console.log('preview box:', box.width.toFixed(0) + '×' + box.height.toFixed(0),
            '| natural', nat.w + '×' + nat.h,
            '| ratio box', (box.width/box.height).toFixed(3), 'vs photo', (nat.w/nat.h).toFixed(3));
await p.locator('section.card', { hasText: 'Product Photo' }).screenshot({ path: SP + '/30-preview-fit.png' });

const direct = p.locator('section.card').filter({ hasText: 'Materials, trims, packaging' });
const row = direct.locator('tbody tr').first();
await row.locator('input[aria-label="Description"]').fill('Grading');
await row.locator('input[aria-label="Quantity"]').fill('1');
await row.locator('input[aria-label="Unit Price"]').fill('900');
await p.waitForTimeout(200);

await p.locator('.app-nav a', { hasText: 'Card' }).click();
await p.waitForSelector('.app-main .cp-card');
const cbox = await p.locator('.app-main .cp-photo').boundingBox();
console.log('card photo box:', cbox.width.toFixed(0) + '×' + cbox.height.toFixed(0),
            '| ratio', (cbox.width/cbox.height).toFixed(3), 'vs photo', (nat.w/nat.h).toFixed(3));
await p.locator('.app-main .cp-card').screenshot({ path: SP + '/31-card-fit.png' });

await p.evaluate(() => { document.body.dataset.print = 'card'; });
await p.emulateMedia({ media: 'print' });
await p.screenshot({ path: SP + '/32-print-card-fit.png', fullPage: true });
await p.evaluate(() => { document.body.dataset.print = 'sheet'; });
await p.screenshot({ path: SP + '/33-print-sheet-fit.png', fullPage: true });
await p.emulateMedia({ media: 'screen' });
console.log('errors:', errs.length ? errs : 'none');
await b.close();
