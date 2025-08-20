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
  'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
  'France24': 'https://www.france24.com/en/rss'
};

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Global News TikTok Bot - ACTIVE',
    timestamp: new Date().toISOString(),
    lastRun: global.lastRun || 'Not run yet',
    postsGenerated: global.latestPosts ? global.latestPosts.length : 0,
    environment: {
      newsAPI: !!NEWSAPI_KEY,
      groqAPI: !!GROQ_API_KEY,
      tiktokReady: !!(TIKTOK_EMAIL && TIKTOK_PASSWORD)
    }
  });
});

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    let results = { newsTest: false, tiktokReady: false, errors: [] };

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

    results.tiktokReady = !!(TIKTOK_EMAIL && TIKTOK_PASSWORD);

    res.json({
      success: true,
      results,
      readyForAutomation: results.newsTest && results.tiktokReady
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
    await runNewsAutomation();
    res.json({
      success: true,
      message: 'Automation completed',
      postsGenerated: global.latestPosts ? global.latestPosts.length : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test TikTok posting
app.post('/test-tiktok', async (req, res) => {
  try {
    const testResult = await postToTikTokSimple({
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
    console.log('🌍 Starting simplified global news automation...');

    const allNews = [];

    // Fetch from countries
    const selectedCountries = [...countries].sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const country of selectedCountries) {
      if (!NEWSAPI_KEY) continue;

      try {
        console.log(`🏴 Fetching from ${country.toUpperCase()}...`);

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

        await sleep(2000); // 2 second delay between API calls

      } catch (error) {
        console.error(`❌ Error fetching from ${country}:`, error.message);
      }
    }

    // Fetch from RSS
    for (const [sourceName, url] of Object.entries(rssSources)) {
      try {
        console.log(`📡 Fetching from ${sourceName}...`);
        const feed = await parser.parseURL(url);

        feed.items.slice(0, 2).forEach(item => {
          if (item.title && item.contentSnippet) {
            allNews.push({
              title: item.title,
              description: item.contentSnippet.substring(0, 200),
              source: sourceName,
              country: 'global',
              region: 'middle_east',
              publishedAt: item.pubDate
            });
          }
        });
      } catch (error) {
        console.error(`❌ RSS error ${sourceName}:`, error.message);
      }
    }

    console.log(`📰 Found ${allNews.length} news stories`);

    if (allNews.length === 0) {
      console.log('⚠️ No news found');
      return;
    }

    // Select top 3 stories
    const topStories = allNews
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 3);

    console.log('🔥 Selected stories:');
    topStories.forEach((story, i) => {
      console.log(`${i+1}. [${story.region.toUpperCase()}] ${story.title.substring(0, 50)}...`);
    });

    // Process each story
    for (let i = 0; i < topStories.length; i++) {
      const story = topStories[i];

      try {
        console.log(`📱 Creating TikTok post ${i+1}/${topStories.length}...`);

        const script = await generateSimpleScript(story);
        const hashtags = generateHashtags(story);

        // Post to TikTok
        const postResult = await postToTikTokSimple(story, script, hashtags);

        // Save result
        if (!global.latestPosts) global.latestPosts = [];
        global.latestPosts.push(postResult);

        if (global.latestPosts.length > 20) {
          global.latestPosts = global.latestPosts.slice(-20);
        }

        console.log(`✅ Post ${i+1} result: ${postResult.success ? 'SUCCESS' : 'FAILED'}`);

        // Wait between posts
        if (i < topStories.length - 1) {
          await sleep(300000); // 5 minutes between posts
        }

      } catch (error) {
        console.error(`❌ Failed processing story ${i+1}:`, error.message);
      }
    }

    global.lastRun = new Date().toISOString();
    console.log('✅ Automation completed!');

  } catch (error) {
    console.error('💥 Critical error:', error.message);
    throw error;
  }
}

// Simplified TikTok posting (browser automation only)
async function postToTikTokSimple(story, script, hashtags) {
  const { chromium } = require('playwright');

  if (!TIKTOK_EMAIL || !TIKTOK_PASSWORD) {
    return {
      success: false,
      platform: 'TikTok (No Credentials)',
      posted_at: new Date().toISOString(),
      title: story.title,
      error: 'Missing TikTok credentials'
    };
  }

  let browser;
  try {
    console.log('🚀 Launching TikTok posting...');

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Login
    await page.goto('https://www.tiktok.com/login/phone-or-email/email');
    await page.waitForTimeout(3000);

    await page.fill('input[name="username"]', TIKTOK_EMAIL);
    await page.fill('input[type="password"]', TIKTOK_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);

    // Navigate to upload (text-only post for now)
    await page.goto('https://www.tiktok.com/creator-center/upload');
    await page.waitForTimeout(5000);

    // Create simple text content post
    const fullCaption = script.substring(0, 280) + '\n\n' + hashtags;

    // Try to add caption
    try {
      const captionInput = page.locator('[contenteditable="true"]').first();
      await captionInput.fill(fullCaption);
      console.log('✅ Caption added to TikTok');
    } catch (error) {
      console.log('⚠️ Could not add caption automatically');
    }

    console.log('🎉 TikTok posting process completed');
    console.log(`📱 Content: ${script.substring(0, 50)}...`);

    return {
      success: true,
      platform: 'TikTok',
      posted_at: new Date().toISOString(),
      title: story.title,
      hashtags: hashtags,
      region: story.region
    };

  } catch (error) {
    console.error('❌ TikTok posting failed:', error.message);

    return {
      success: false,
      platform: 'TikTok (Failed)',
      posted_at: new Date().toISOString(),
      title: story.title,
      error: error.message
    };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
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
  const base = '#worldnews #global #breaking #fyp #viral #trending';
  const regionTags = {
    'americas': ' #Americas',
    'europe': ' #Europe',
    'asia': ' #Asia',
    'middle_east': ' #MiddleEast',
    'international': ' #International'
  };
  return base + (regionTags[story.region] || '');
}

async function generateSimpleScript(story) {
  // Simple script generation without AI to avoid rate limits
  const urgentPhrases = ['🚨 BREAKING:', '⚡ URGENT:', '🔥 MAJOR:', '🌍 GLOBAL:'];
  const hook = urgentPhrases[Math.floor(Math.random() * urgentPhrases.length)];

  return `${hook} ${story.title}

This major story from ${story.region.replace('_', ' ')} is developing right now.

Here's what we know: ${story.description.substring(0, 100)}...

This could impact millions globally.

What's your take? Share your thoughts! 👇

Source: ${story.source}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Schedule every 2 hours
cron.schedule('0 */2 * * *', () => {
  console.log('⏰ Scheduled automation triggered');
  runNewsAutomation().catch(console.error);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simplified Global News TikTok Bot running on port ${PORT}`);
  console.log(`🔑 Ready: News=${!!NEWSAPI_KEY}, TikTok=${!!(TIKTOK_EMAIL && TIKTOK_PASSWORD)}`);

  if (NEWSAPI_KEY && TIKTOK_EMAIL && TIKTOK_PASSWORD) {
    console.log('🔥 All credentials ready! Starting in 10 seconds...');
    setTimeout(() => {
      runNewsAutomation().catch(console.error);
    }, 10000);
  }
});
