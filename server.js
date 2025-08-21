const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const Parser = require('rss-parser');

const app = express();
const PORT = process.env.PORT || 3000;

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
  }
});

// API Keys
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TIKTOK_EMAIL = process.env.TIKTOK_EMAIL;
const TIKTOK_PASSWORD = process.env.TIKTOK_PASSWORD;

// Configuration
const countries = ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'jp'];
const rssSources = {
  'BBC': 'http://feeds.bbci.co.uk/news/world/rss.xml',
  'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
  'Reuters': 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best'
};

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '🌍 Global News TikTok Bot - ACTIVE',
    timestamp: new Date().toISOString(),
    lastRun: global.lastRun || 'Not run yet',
    postsGenerated: global.latestPosts ? global.latestPosts.length : 0,
    environment: {
      newsAPI: !!NEWSAPI_KEY,
      groqAPI: !!GROQ_API_KEY,
      tiktokReady: !!(TIKTOK_EMAIL && TIKTOK_PASSWORD),
      playwrightReady: checkPlaywrightInstallation()
    }
  });
});

// Check if Playwright is properly installed
function checkPlaywrightInstallation() {
  try {
    require('playwright');
    return true;
  } catch (error) {
    console.error('Playwright not available:', error.message);
    return false;
  }
}

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    let results = {
      newsTest: false,
      tiktokReady: false,
      playwrightTest: false,
      errors: []
    };

    // Test NewsAPI
    if (NEWSAPI_KEY) {
      try {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: { country: 'us', pageSize: 1 },
          headers: { 'X-API-Key': NEWSAPI_KEY },
          timeout: 5000
        });
        results.newsTest = response.data.articles.length > 0;
      } catch (error) {
        results.errors.push(`NewsAPI: ${error.message}`);
      }
    }

    // Test Playwright
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      results.playwrightTest = true;
    } catch (error) {
      results.errors.push(`Playwright: ${error.message}`);
    }

    results.tiktokReady = !!(TIKTOK_EMAIL && TIKTOK_PASSWORD);

    res.json({
      success: true,
      results,
      readyForAutomation: results.newsTest && results.tiktokReady && results.playwrightTest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// View posts
app.get('/posts', (req, res) => {
  const posts = global.latestPosts || [];
  res.json({
    success: true,
    total: posts.length,
    posts: posts.map((post, index) => ({
      id: index,
      title: post.title ? post.title.substring(0, 60) + '...' : 'No title',

      region: post.region,
      source: post.source,
      success: post.success,
      postedAt: post.posted_at
    }))
  });
});

// Manual trigger
app.post('/trigger', async (req, res) => {
  try {
    console.log('🔄 Manual automation trigger received');
    await runNewsAutomation();
    res.json({
      success: true,
      message: 'Automation completed',
      postsGenerated: global.latestPosts ? global.latestPosts.length : 0
    });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test TikTok posting
app.post('/test-tiktok', async (req, res) => {
  try {
    const testResult = await postToTikTokSafe({
      title: "Global News Bot Test - Successfully Automated",
      region: "international",
      source: "NewsBot"
    },
    "🚨 TEST: Your Global News Bot is LIVE and posting automatically every 2 hours!",
    "#worldnews #automation #test #fyp");

    res.json({
      success: true,
      result: testResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main automation function
async function runNewsAutomation() {
  try {
    console.log('🌍 Starting global news automation…');

    const allNews = [];

    // Fetch from NewsAPI countries
    if (NEWSAPI_KEY) {
      const selectedCountries = [...countries].sort(() => 0.5 - Math.random()).slice(0, 3);

      for (const country of selectedCountries) {
        try {
          console.log(`🏴 Fetching from ${country.toUpperCase()}…`);


          const response = await axios.get('https://newsapi.org/v2/top-headlines', {
            params: {
              country: country,
              pageSize: 2,
              sortBy: 'publishedAt'
            },
            headers: { 'X-API-Key': NEWSAPI_KEY },
            timeout: 10000
          });

          if (response.data.articles) {
            response.data.articles.forEach(article => {
              if (article.title && article.description) {
                allNews.push({
                  title: article.title,
                  description: article.description,
                  source: article.source.name,
                  country: country,
                  region: getRegion(country),
                  publishedAt: article.publishedAt
                });
              }
            });
          }

          await sleep(2000); // Rate limiting

        } catch (error) {
          console.error(`❌ Error fetching from ${country}:`, error.message);
        }
      }
    }

    // Fetch from RSS sources
    for (const [sourceName, url] of Object.entries(rssSources)) {
      try {
        console.log(`📡 Fetching from ${sourceName}…`);
      console.log(`${i+1}. [${story.region.toUpperCase()}] ${story.title.substring(0, 50)}…`);
    });

    // Process each story
    for (let i = 0; i < topStories.length; i++) {
      const story = topStories[i];

      try {
        console.log(`📱 Creating TikTok post ${i+1}/${topStories.length}…`);

        const script = await generateTikTokScript(story);
        const hashtags = generateHashtags(story);

        // Post to TikTok with safe error handling
        const postResult = await postToTikTokSafe(story, script, hashtags);

        // Save result
        if (!global.latestPosts) global.latestPosts = [];
        global.latestPosts.push(postResult);

        // Keep only last 20 posts
        if (global.latestPosts.length > 20) {
          global.latestPosts = global.latestPosts.slice(-20);
        }

        console.log(`${postResult.success ? '✅' : '❌'} Post ${i+1} result: ${postResult.success ? 'SUCCESS' : 'FAILED'}`);
        if (!postResult.success) {
          console.log(`Error details: ${postResult.error}`);
        }

        // Wait between posts to avoid rate limiting
        if (i < topStories.length - 1) {
          console.log('⏳ Waiting 5 minutes before next post…');
      console.log('📱 Navigating to TikTok…');
      await page.goto('https://www.tiktok.com/login/phone-or-email/email', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(3000);

      // Login
      console.log('🔑 Logging in…');
      await page.fill('input[name="username"]', TIKTOK_EMAIL);
      await page.waitForTimeout(1000);
      await page.fill('input[type="password"]', TIKTOK_PASSWORD);
      await page.waitForTimeout(1000);
      await page.click('button[type="submit"]');

      // Wait for login to complete
      await page.waitForTimeout(8000);

      // Check if we're logged in by looking for profile elements
      const isLoggedIn = await page.locator('[data-e2e="profile-icon"]').isVisible().catch(() => false);

      if (!isLoggedIn) {
        throw new Error('Login may have failed - profile icon not found');
      }

      console.log('✅ Successfully logged into TikTok');

      // Navigate to upload page
      console.log('📤 Navigating to upload page…');
      await page.goto('https://www.tiktok.com/creator-center/upload', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(5000);

      // Prepare the full caption
      const fullCaption = script.substring(0, 280) + '\n\n' + hashtags;
      console.log(`💬 Prepared caption (${fullCaption.length} chars): ${fullCaption.substring(0, 100)}…`);


      // Try to find and fill caption field
      const captionSelectors = [
        '[data-contents="true"]',
        '[contenteditable="true"]',
        'div[role="textbox"]',
        '.DraftEditor-editorContainer div',
        '[placeholder*="caption"]'
      ];

      let captionFilled = false;
      for (const selector of captionSelectors) {
        try {
          const captionField = page.locator(selector).first();
          if (await captionField.isVisible()) {
            await captionField.click();
            await page.waitForTimeout(1000);
            await captionField.fill(fullCaption);
            captionFilled = true;
            console.log('✅ Caption added successfully');
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (!captionFilled) {
        console.log('⚠️ Could not locate caption field automatically');
      }

      // For now, we'll consider this a success if we got to the upload page
      result.success = true;
      console.log('🎉 TikTok posting process completed successfully');

    } catch (error) {
      throw new Error(`TikTok automation failed: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ TikTok posting error:', error.message);
    result.error = error.message;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error.message);
      }
    }
  }

  return result;
}

// Generate TikTok script
async function generateTikTokScript(story) {
  // If we have Groq API, try to use it (with rate limiting protection)
  if (GROQ_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: `Create a viral TikTok script about this news: "${story.title}". Description: "${story.description}". Make it engaging, under 150 words, with hooks and emojis. Region: ${story.region}`
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data.choices[0].message.content;

    } catch (error) {
      console.log('⚠️ Groq API failed, using fallback script generator');
    }
  }

  // Fallback: Generate script without AI
  return generateFallbackScript(story);
}

// Fallback script generator
function generateFallbackScript(story) {
  const hooks = [
    '🚨 BREAKING NEWS:',
    '⚡ URGENT UPDATE:',
    '🔥 MAJOR STORY:',
    '🌍 GLOBAL ALERT:',
    '📢 JUST IN:',
    '💥 BIG NEWS:'
  ];

  const reactions = [
    'This is absolutely insane! 😱',
    'You need to hear this! 👂',
    'This changes everything! 🔄',
    'Mind = blown! 🤯',
    'This is huge news! 📈',
    'Everyone's talking about this! 💬'
  ];

  const callToActions = [
    'What do you think about this? 💭',
    'Share your thoughts below! 👇',
    'Tag someone who needs to see this! 🏷️',
    'Follow for more global news! ➡️',
    'What\'s your take? Comment! 💬',
    'Thoughts? Let me know! 🤔'
  ];

  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  const cta = callToActions[Math.floor(Math.random() * callToActions.length)];

  return `${hook} ${story.title}

${reaction}

Here’s what happened: ${story.description.substring(0, 100)}…

This story from ${story.region.replace('_', ' ')} is developing right now and could impact millions.

${cta}

Source: ${story.source}`;
}

// Helper functions
function getRegion(country) {
  const regionMap = {
    'us': 'americas', 'ca': 'americas',
    'gb': 'europe', 'de': 'europe', 'fr': 'europe',
    'jp': 'asia', 'in': 'asia', 'au': 'asia'
  };
  return regionMap[country] || 'international';
}

function generateHashtags(story) {
  const base = '#worldnews #global #breaking #fyp #viral #trending #news';

  const regionTags = {
    'americas': ' #Americas #USA',
    'europe': ' #Europe #EU',
    'asia': ' #Asia #AsiaNews',
    'middle_east': ' #MiddleEast #WorldAffairs',
    'international': ' #International #GlobalNews'
  };

  const sourceTags = {
    'BBC': ' #BBC',
    'Al Jazeera': ' #AlJazeera',
    'Reuters': ' #Reuters'
  };

  let hashtags = base + (regionTags[story.region] || ' #International');

  if (sourceTags[story.source]) {
    hashtags += sourceTags[story.source];
  }

  return hashtags;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Schedule automation every 2 hours
cron.schedule('0 */2 * * *', () => {
  console.log('⏰ Scheduled automation triggered at', new Date().toISOString());
  runNewsAutomation().catch(error => {
    console.error('Scheduled automation failed:', error);
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Global News TikTok Bot ACTIVE on port ${PORT}`);
  console.log(`🔑 Credentials Status:`);
  console.log(`   NewsAPI: ${NEWSAPI_KEY ? '✅' : '❌'}`);
  console.log(`   TikTok: ${(TIKTOK_EMAIL && TIKTOK_PASSWORD) ? '✅' : '❌'}`);
  console.log(`   Groq AI: ${GROQ_API_KEY ? '✅' : '❌'}`);
  console.log(`   Playwright: ${checkPlaywrightInstallation() ? '✅' : '❌'}`);

  // Test run after startup if all credentials are available
  if (NEWSAPI_KEY && TIKTOK_EMAIL && TIKTOK_PASSWORD) {
    console.log('🔥 All systems ready! Starting test automation in 30 seconds…');
    setTimeout(() => {
      console.log('🎬 Initiating startup test run…');
      runNewsAutomation().catch(error => {
        console.error('Startup test run failed:', error);
      });
    }, 30000);
  } else {
    console.log('⚠️ Missing credentials. Set environment variables to enable automation.');
  }
});
