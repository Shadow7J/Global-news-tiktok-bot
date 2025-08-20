const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const Parser = require('rss-parser');
const { postToTikTok } = require('./tiktok-poster');
const { createNewsVideo } = require('./video-generator');

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

// Global configuration
const countries = ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'jp'];
const rssSources = {
  'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
  'France24': 'https://www.france24.com/en/rss'
};

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Global News TikTok Bot - REAL POSTING ACTIVE',
    timestamp: new Date().toISOString(),
    lastRun: global.lastRun || 'Not run yet',
    nextRun: 'Every 2 hours',
    countries: countries.length,
    rssSources: Object.keys(rssSources).length,
    postsGenerated: global.latestPosts ? global.latestPosts.length : 0,
    realPosting: !!(TIKTOK_EMAIL && TIKTOK_PASSWORD),
    environment: {
      newsAPI: !!NEWSAPI_KEY,
      groqAPI: !!GROQ_API_KEY,
      tiktokCredentials: !!(TIKTOK_EMAIL && TIKTOK_PASSWORD)
    }
  });
});

// System test
app.get('/test', async (req, res) => {
  try {
    console.log('🧪 Running comprehensive system test...');

    let testResults = {
      newsApiTest: false,
      groqTest: false,
      rssTest: false,
      videoCreation: false,
      tiktokReady: false,
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
        testResults.newsApiTest = response.data.articles.length > 0;
      } catch (error) {
        testResults.errors.push(`NewsAPI: ${error.message}`);
      }
    }

    // Test Groq AI
    if (GROQ_API_KEY) {
      try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          messages: [{ role: 'user', content: 'Say hello' }],
          model: 'mixtral-8x7b-32768',
          max_tokens: 10
        }, {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        testResults.groqTest = response.data.choices.length > 0;
      } catch (error) {
        testResults.errors.push(`Groq: ${error.message}`);
      }
    }

    // Test RSS
    try {
      const feed = await parser.parseURL('https://www.france24.com/en/rss');
      testResults.rssTest = feed.items.length > 0;
    } catch (error) {
      testResults.errors.push(`RSS: ${error.message}`);
    }

    // Test video creation
    try {
      const testStory = {
        title: 'Test Story',
        region: 'international',
        source: 'Test Source'
      };
      const videoPath = await createNewsVideo(testStory, 'Test script');
      testResults.videoCreation = !!videoPath;
    } catch (error) {
      testResults.errors.push(`Video: ${error.message}`);
    }

    // Test TikTok credentials
    testResults.tiktokReady = !!(TIKTOK_EMAIL && TIKTOK_PASSWORD);
    if (!testResults.tiktokReady) {
      testResults.errors.push('TikTok credentials missing');
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      testResults,
      recommendations: generateRecommendations(testResults),
      readyForAutomation: testResults.newsApiTest && testResults.groqTest && testResults.tiktokReady
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function generateRecommendations(testResults) {
  const recommendations = [];

  if (!testResults.newsApiTest) {
    recommendations.push('Add NEWSAPI_KEY from newsapi.org');
  }
  if (!testResults.groqTest) {
    recommendations.push('Add GROQ_API_KEY from console.groq.com');
  }
  if (!testResults.tiktokReady) {
    recommendations.push('Add TIKTOK_EMAIL and TIKTOK_PASSWORD environment variables');
  }
  if (testResults.newsApiTest && testResults.groqTest && testResults.tiktokReady) {
    recommendations.push('🚀 All systems ready! Bot will post to TikTok automatically.');
  }

  return recommendations;
}

// View posts
app.get('/posts', (req, res) => {
  const posts = global.latestPosts || [];
  res.json({
    success: true,
    total: posts.length,
    lastUpdated: global.lastRun,
    posts: posts.map((post, index) => ({
      id: index,
      title: post.title ? post.title.substring(0, 60) + '...' : 'No title',
      region: post.region,
      source: post.source,
      platform: post.platform,
      postedAt: post.posted_at || post.createdAt,
      success: post.success,
      hashtags: post.hashtags
    }))
  });
});

// Get specific post
app.get('/post/:id', (req, res) => {
  const posts = global.latestPosts || [];
  const id = parseInt(req.params.id);

  if (id >= 0 && id < posts.length) {
    res.json({
      success: true,
      post: posts[id]
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }
});

// Manual trigger
app.post('/trigger', async (req, res) => {
  try {
    console.log('🔥 Manual automation trigger initiated...');
    await runNewsAutomation();
    res.json({
      success: true,
      message: 'News automation completed successfully',
      timestamp: new Date().toISOString(),
      postsGenerated: global.latestPosts ? global.latestPosts.length : 0
    });
  } catch (error) {
    console.error('❌ Manual trigger failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test TikTok posting
app.post('/test-tiktok', async (req, res) => {
  try {
    console.log('🧪 Testing TikTok posting...');

    const testStory = {
      title: "Global News Bot Test - Successfully Automated",
      description: "This is a test post from your automated global news TikTok bot",
      source: "NewsBot System",
      region: "international",
      country: "global",
      url: "#"
    };

    const testScript = `🚨 TEST: Global News Bot is LIVE!

Your automated system is now successfully posting worldwide news to TikTok every 2 hours.

Coverage includes:
• Americas 🌎
• Europe 🇪🇺 
• Asia 🌏
• Middle East 🕌
• Africa 🌍

What global topics interest you most? 👇`;

    const testHashtags = "#worldnews #global #newsbot #automation #breaking #fyp #viral #test";

    const result = await postToTikTok(testStory, testScript, testHashtags);

    res.json({
      success: true,
      message: 'TikTok test posting completed',
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TikTok test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main automation function
async function runNewsAutomation() {
  try {
    console.log('🌍 Starting global news automation with TikTok posting...');
    console.log(`📊 Sources: ${countries.length} countries + ${Object.keys(rssSources).length} RSS feeds`);

    const allNews = [];
    let successfulFetches = 0;

    // Fetch from countries
    const selectedCountries = [...countries].sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const country of selectedCountries) {
      try {
        console.log(`🏴 Fetching from ${country.toUpperCase()}...`);

        if (!NEWSAPI_KEY) {
          console.log('⚠️ NEWSAPI_KEY missing');
          continue;
        }

        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            country: country,
            pageSize: 3,
            sortBy: 'publishedAt'
          },
          headers: { 'X-API-Key': NEWSAPI_KEY },
          timeout: 10000
        });

        if (response.data.articles && response.data.articles.length > 0) {
          successfulFetches++;
          response.data.articles.forEach(article => {
            if (article.title && article.description && article.title.length > 10) {
              allNews.push({
                title: article.title,
                description: article.description,
                source: article.source.name,
                country: country,
                region: getRegion(country),
                publishedAt: article.publishedAt,
                url: article.url,
                type: 'api'
              });
            }
          });
        }

        await sleep(1000);

      } catch (error) {
        console.error(`❌ Error fetching from ${country}:`, error.message);
      }
    }

    // Fetch from RSS
    for (const [sourceName, url] of Object.entries(rssSources)) {
      try {
        console.log(`📡 Fetching from ${sourceName}...`);

        const feed = await parser.parseURL(url);

        if (feed.items && feed.items.length > 0) {
          successfulFetches++;
          feed.items.slice(0, 3).forEach(item => {
            if (item.title && item.contentSnippet && item.title.length > 10) {
              allNews.push({
                title: item.title,
                description: item.contentSnippet.substring(0, 200),
                source: sourceName,
                country: 'global',
                region: sourceName === 'Al Jazeera' ? 'middle_east' : 'europe',
                publishedAt: item.pubDate || item.isoDate,
                url: item.link,
                type: 'rss'
              });
            }
          });
        }

      } catch (error) {
        console.error(`❌ RSS error ${sourceName}:`, error.message);
      }
    }

    console.log(`📰 Found ${allNews.length} news stories`);

    if (allNews.length === 0) {
      console.log('⚠️ No news found, check API keys');
      return;
    }

    // Select top 3 stories
    const topStories = allNews
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 3);

    console.log('🔥 Selected stories for TikTok:');
    topStories.forEach((story, i) => {
      console.log(`${i+1}. [${story.region.toUpperCase()}] ${story.title.substring(0, 50)}...`);
    });

    // Process each story
    for (let i = 0; i < topStories.length; i++) {
      const story = topStories[i];

      try {
        console.log(`📱 Creating TikTok post ${i+1}/${topStories.length}...`);

        const script = await generateScript(story);
        const hashtags = generateHashtags(story);

        // Real TikTok posting
        const postResult = await postToTikTok(story, script, hashtags);

        // Save result
        if (!global.latestPosts) global.latestPosts = [];
        global.latestPosts.push({
          ...postResult,
          script: script,
          region: story.region,
          source: story.source,
          country: story.country,
          url: story.url
        });

        // Keep only last 20
        if (global.latestPosts.length > 20) {
          global.latestPosts = global.latestPosts.slice(-20);
        }

        console.log(`✅ TikTok post ${i+1} completed: ${postResult.success ? 'SUCCESS' : 'FAILED'}`);

        // Wait between posts
        if (i < topStories.length - 1) {
          console.log('⏱️ Waiting 5 minutes before next post...');
          await sleep(300000); // 5 minutes
        }

      } catch (error) {
        console.error(`❌ Failed to process story ${i+1}:`, error.message);
      }
    }

    global.lastRun = new Date().toISOString();
    console.log('🎉 Global news automation cycle completed!');

  } catch (error) {
    console.error('💥 Critical error:', error.message);
    throw error;
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

async function generateScript(story) {
  if (!GROQ_API_KEY) {
    return createFallbackScript(story);
  }

  try {
    const prompt = `Create a viral 60-second TikTok script for this global news:

Title: ${story.title}
Description: ${story.description}
Region: ${story.region}

Requirements:
- Start with attention-grabbing hook
- Explain the story simply
- Explain global impact
- End with engaging question
- Under 150 words
- Conversational tone

Make it viral and engaging.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 300,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Script generation error:', error.message);
    return createFallbackScript(story);
  }
}

function createFallbackScript(story) {
  return `🚨 BREAKING: ${story.title}

This major story is developing worldwide. Here's what we know: ${story.description.substring(0, 100)}...

This could impact millions globally and shape future developments in ${story.region.replace('_', ' ')}.

What's your take on this story? Share your thoughts! 👇

Source: ${story.source}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

// Schedule every 2 hours
cron.schedule('0 */2 * * *', () => {
  console.log('⏰ Scheduled TikTok automation triggered');
  runNewsAutomation().catch(error => {
    console.error('💥 Scheduled automation failed:', error.message);
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Global News TikTok Bot with REAL POSTING running on port ${PORT}`);
  console.log(`🌍 Coverage: ${countries.length} countries + ${Object.keys(rssSources).length} RSS sources`);
  console.log(`🎬 TikTok posting: ${!!(TIKTOK_EMAIL && TIKTOK_PASSWORD) ? 'ENABLED' : 'DISABLED - Add credentials'}`);
  console.log(`🔑 APIs: News=${!!NEWSAPI_KEY}, AI=${!!GROQ_API_KEY}`);

  if (NEWSAPI_KEY && GROQ_API_KEY && TIKTOK_EMAIL && TIKTOK_PASSWORD) {
    console.log('🔥 All systems ready! Starting automation in 10 seconds...');
    setTimeout(() => {
      runNewsAutomation().catch(error => {
        console.error('💥 Initial automation failed:', error.message);
      });
    }, 10000);
  } else {
    console.log('⚠️ Add missing environment variables for full automation');
  }
});

module.exports = app;
