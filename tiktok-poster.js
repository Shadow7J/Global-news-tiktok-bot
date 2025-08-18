javascript
const { chromium } = require('playwright');
const fs = require('fs');

async function postToTikTok(videoPath, script, hashtags) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  let browser;
  try {
    console.log('🚀 Launching browser for TikTok posting...');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Login to TikTok
    console.log('🔐 Logging in to TikTok...');
    await page.goto('https://www.tiktok.com/login/phone-or-email/email', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(3000);

    // Fill login credentials
    await page.fill('input[name="username"]', process.env.TIKTOK_EMAIL);
    await page.waitForTimeout(1000);
    await page.fill('input[type="password"]', process.env.TIKTOK_PASSWORD);
    await page.waitForTimeout(1000);

    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Navigate to upload page
    console.log('📤 Navigating to upload page...');
    await page.goto('https://www.tiktok.com/creator-center/upload', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(3000);

    // Upload video file
    console.log('📹 Uploading video...');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(videoPath);

    // Wait for video to process
    console.log('⏳ Waiting for video processing...');
    await page.waitForTimeout(15000);

    // Add caption with hashtags
    console.log('✍️ Adding caption and hashtags...');
    const fullCaption = script.substring(0, 280) + '\n\n' + hashtags;

    const captionInput = page.locator('[data-testid="editor-caption"], [contenteditable="true"], textarea').first();
    await captionInput.fill(fullCaption);
    await page.waitForTimeout(2000);

    // Set visibility to public
    console.log('🌐 Setting video to public...');
    try {
      await page.click('[data-testid="public-post-toggle"]');
    } catch (error) {
      console.log('Public toggle not found, likely already public');
    }
    await page.waitForTimeout(1000);

    // Post the video
    console.log('🚀 Publishing video...');
    await page.click('button[data-testid="post-button"], button:has-text("Post")');

    // Wait for confirmation
    await page.waitForTimeout(5000);

    console.log('✅ Successfully posted to TikTok!');

    // Clean up video file
    try {
      fs.unlinkSync(videoPath);
      console.log('🗑️ Cleaned up video file');
    } catch (error) {
      console.log('Warning: Could not clean up video file');
    }

  } catch (error) {
    console.error('❌ TikTok posting failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { postToTikTok };
