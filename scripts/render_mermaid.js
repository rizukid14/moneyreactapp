import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const htmlPath = path.join(rootDir, 'docs', 'diagrams', 'moneyapp-mermaid.html');
const outputDir = path.join(rootDir, 'docs', 'diagrams');

async function render() {
  console.log('Launching browser to render Mermaid diagrams...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  await page.goto(`file://${htmlPath}`);
  
  // Wait for mermaid to render
  await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const tabs = ['arch', 'zbb', 'ocr', 'family'];
  const names = [
    '1_system_architecture',
    '2_zbb_transaction_flow',
    '3_ai_scan_split_bill',
    '4_family_workspace_sync'
  ];

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const name = names[i];

    console.log(`Rendering tab ${tab} -> ${name}.png...`);
    await page.evaluate((t) => {
      // @ts-ignore
      window.switchTab(t);
    }, tab);

    await page.waitForTimeout(500);
    const panel = page.locator(`#panel-${tab}`);
    await panel.screenshot({ path: path.join(outputDir, `${name}.png`) });
    
    // Also save SVG if possible
    const svgHtml = await page.locator(`#panel-${tab} .mermaid`).innerHTML();
    fs.writeFileSync(path.join(outputDir, `${name}.svg`), svgHtml, 'utf8');
  }

  await browser.close();
  console.log('All Mermaid diagrams exported successfully!');
}

render().catch(console.error);
