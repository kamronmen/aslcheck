const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function main() {
  const assetsDir = path.resolve('video_assets');
  const timingsPath = path.join(assetsDir, 'timings.json');
  if (!fs.existsSync(timingsPath)) {
    console.error('timings.json not found! Run generate_audio.cjs first.');
    process.exit(1);
  }

  const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
  console.log('Loaded scene timings:', timings);

  const rawVideoDir = path.join(assetsDir, 'raw_video');
  if (fs.existsSync(rawVideoDir)) {
    fs.rmSync(rawVideoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(rawVideoDir, { recursive: true });

  console.log('Launching Chrome in 16:9 1920x1080...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--window-size=1920,1080', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: rawVideoDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // Helper for smooth mouse movements
  async function smoothMouseMove(x, y, steps = 20) {
    await page.mouse.move(x, y, { steps });
  }

  console.log('Navigating to https://aslcheck-uz.vercel.app/ ...');
  await page.goto('https://aslcheck-uz.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // === SCENE 1: Kirish (Intro) ===
  const s1 = timings.find(t => t.id === 1) || { duration: 10 };
  console.log(`[Scene 1] Intro - duration: ${s1.duration}s`);
  const s1Start = Date.now();
  await smoothMouseMove(960, 400, 30);
  await page.waitForTimeout(1500);
  await smoothMouseMove(960, 520, 25);
  // Hover over hero badges
  await page.evaluate(() => window.scrollBy({ top: 120, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollBy({ top: -120, behavior: 'smooth' }));
  const s1Remaining = Math.max(0, s1.duration * 1000 - (Date.now() - s1Start));
  await page.waitForTimeout(s1Remaining);

  // === SCENE 2: Real Product Verification ===
  const s2 = timings.find(t => t.id === 2) || { duration: 12 };
  console.log(`[Scene 2] Real Product - duration: ${s2.duration}s`);
  const s2Start = Date.now();
  // Find search input
  const inputSelector = 'input[type="text"], input[placeholder*="ASL-"]';
  await page.click(inputSelector);
  await page.waitForTimeout(400);
  // Type serial code with human cadence
  await page.fill(inputSelector, '');
  await page.type(inputSelector, 'ASL-88219-UZ', { delay: 90 });
  await page.waitForTimeout(500);
  // Click verify button
  await page.click('button:has-text("Tekshirish")');
  // Wait for passport card
  await page.waitForTimeout(1500);
  // Scroll to passport
  await page.evaluate(() => {
    const el = document.querySelector('#verification-result') || document.querySelector('.border-emerald-500\\/30');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else window.scrollBy({ top: 450, behavior: 'smooth' });
  });
  await smoothMouseMove(960, 600, 20);
  await page.waitForTimeout(2000);
  await smoothMouseMove(800, 650, 20);
  const s2Remaining = Math.max(0, s2.duration * 1000 - (Date.now() - s2Start));
  await page.waitForTimeout(s2Remaining);

  // === SCENE 3: AI Expert & Ingredient Analysis ===
  const s3 = timings.find(t => t.id === 3) || { duration: 12 };
  console.log(`[Scene 3] AI Expert - duration: ${s3.duration}s`);
  const s3Start = Date.now();
  // Navigate to AI Expert tab
  await page.click('button:has-text("AI Ekspert"), a:has-text("AI Ekspert")');
  await page.waitForTimeout(1200);
  await smoothMouseMove(960, 500, 25);
  // Type a sample question into AI Expert input or interact
  const aiInput = 'input[placeholder*="savol"], input[placeholder*="yozing"], textarea';
  if (await page.$(aiInput)) {
    await page.click(aiInput);
    await page.type(aiInput, "Asal tarkibidagi tabiiy moddalar va uning foydasi haqida aytib bering", { delay: 40 });
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Yuborish"), button[type="submit"]');
    await page.waitForTimeout(2000);
  }
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
  const s3Remaining = Math.max(0, s3.duration * 1000 - (Date.now() - s3Start));
  await page.waitForTimeout(s3Remaining);

  // === SCENE 4: Anti-Clone Security Alert ===
  const s4 = timings.find(t => t.id === 4) || { duration: 10 };
  console.log(`[Scene 4] Cloned Code Alert - duration: ${s4.duration}s`);
  const s4Start = Date.now();
  // Return to verify
  await page.click('button:has-text("Tekshirish"), a:has-text("Tekshirish")');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(400);
  await page.click(inputSelector);
  await page.fill(inputSelector, '');
  await page.type(inputSelector, 'CLONE-TEST-99', { delay: 80 });
  await page.waitForTimeout(400);
  await page.click('button:has-text("Tekshirish")');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const el = document.querySelector('#verification-result') || document.querySelector('.border-amber-500\\/30');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else window.scrollBy({ top: 400, behavior: 'smooth' });
  });
  await smoothMouseMove(960, 620, 25);
  const s4Remaining = Math.max(0, s4.duration * 1000 - (Date.now() - s4Start));
  await page.waitForTimeout(s4Remaining);

  // === SCENE 5: B2B Producer Cabinet & Fast QR Batch ===
  const s5 = timings.find(t => t.id === 5) || { duration: 12 };
  console.log(`[Scene 5] B2B Cabinet - duration: ${s5.duration}s`);
  const s5Start = Date.now();
  await page.click('button:has-text("Ishlab chiqaruvchi"), a:has-text("Ishlab chiqaruvchi")');
  await page.waitForTimeout(1500);
  // Scroll down to view charts and Quick Add panel
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  // Click preset "+100 dona" or AI Smart Fill tab if present
  const presetBtn = page.locator('button:has-text("100 dona"), button:has-text("+100")').first();
  if (await presetBtn.isVisible()) {
    await presetBtn.click();
    await page.waitForTimeout(800);
  }
  await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  const s5Remaining = Math.max(0, s5.duration * 1000 - (Date.now() - s5Start));
  await page.waitForTimeout(s5Remaining);

  // === SCENE 6: Outro & Call to Action ===
  const s6 = timings.find(t => t.id === 6) || { duration: 8 };
  console.log(`[Scene 6] Outro - duration: ${s6.duration}s`);
  const s6Start = Date.now();
  await page.click('button:has-text("Tekshirish"), a:has-text("Tekshirish")');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await smoothMouseMove(960, 400, 25);
  await page.waitForTimeout(2000);
  // Hover over the presentation badge in navbar
  await smoothMouseMove(1700, 35, 20);
  const s6Remaining = Math.max(0, s6.duration * 1000 - (Date.now() - s6Start));
  await page.waitForTimeout(s6Remaining);

  // Extra padding at end
  await page.waitForTimeout(1000);

  console.log('Closing browser context to finalize raw video recording...');
  await context.close();
  await browser.close();

  // Find generated webm
  const videoFiles = fs.readdirSync(rawVideoDir).filter(f => f.endsWith('.webm'));
  if (videoFiles.length === 0) {
    throw new Error('No recorded webm video file found!');
  }
  const rawVideoPath = path.join(rawVideoDir, videoFiles[0]);
  console.log('Recorded raw screen video:', rawVideoPath, 'size:', fs.statSync(rawVideoPath).size);

  return { rawVideoPath, timings, assetsDir };
}

main().catch(err => {
  console.error('Walkthrough error:', err);
  process.exit(1);
});
