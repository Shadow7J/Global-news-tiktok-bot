const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const Parser = require('rss-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const parser = new Parser();

// API Keys
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// COUNTRIES & SOURCES
const countries = ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'jp', 'br', 'mx', 'sa', 'ae', 'eg'];

const rssSources = {
  'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
  'DW News': 'https://rss.dw.com/rdf/rss-en-all',
  'France24': 'https://www.france24.com/en/rss'
};

app.use(express.json());

// SIMPLE AUTOMATION FUNCTION
async function runNewsAutomation() {
  try {
    console.log('🌍 Starting global news automation...');

    const allNews = [];

    // Get random countries (3 per cycle)
    const shuffled = [...countries].sort(() => 0.5 - Math.random());
    const selectedCountries = shuffled.slice(0, 3);

    // Fetch from countries
    for (const country of selectedCountries) {
      try {
        console.log(`🏴 Fetching from ${country.toUpperCase()}...`);

        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            country: country,
            pageSize: 3
          },
          headers: { 'X-API-Key': NEWSAPI_KEY }
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
      } catch (error) {
        console.error(`❌ Error fetching from ${country}:`, error.message);
      }
    }

    // Fetch from RSS
    for (const [sourceName, url] of Object.entries(rssSources)) {
      try {
        console.log(`📡 Fetching from ${sourceName}...`);
        const feed = await parser.parseURL(url);

        feed.items.slice(0, 3).forEach(item => {
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
        console.error(`❌ Error fetching RSS from ${sourceName}:`, error.message);
      }
    }

    console.log(`📰 Found ${allNews.length} news stories`);

    // Process top 3 stories
    const topStories = allNews.slice(0, 3);

    for (let i = 0; i < topStories.length; i++) {
      const story = topStories[i];

      try {
        console.log(`📝 Processing story ${i+1}: ${story.title.substring(0, 50)}...`);

        const script = await generateScript(story);
        const hashtags = generateHashtags(story);

        // Simulate TikTok post
        simulateTikTokPost(story, script, hashtags);

        // Save globally
        if (!global.latestPosts) global.latestPosts = [];
        global.latestPosts.push({
          title: story.title,
          script: script,
          hashtags: hashtags,
          region: story.region,
          source: story.source,
          createdAt: new Date().toISOString()
        });

        // Keep only last 10
        if (global.latestPosts.length > 10) {
          global.latestPosts = global.latestPosts.slice(-10);
        }

      } catch (error) {
        console.error(`❌ Failed to process story ${i+1}:`, error.message);
      }
    }

    global.lastRun = new Date().toISOString();
    console.log('✅ News automation completed!');

  } catch (error) {
    console.error('💥 Error in automation:', error);
  }
}

// Helper functions
function getRegion(country) {
  if (['us', 'ca', 'br', 'mx'].includes(country)) return 'americas';
  if (['gb', 'de', 'fr'].includes(country)) return 'europe';
  if (['jp', 'in', 'au'].includes(country)) return 'asia';
  if (['sa', 'ae', 'eg'].includes(country)) return 'middle_east';
  return 'international';
}

function generateHashtags(story) {
  const base = '#worldnews #global #breaking #fyp #viral #trending';

  const regionTags = {
    'americas': '#Americas',
    'europe': '#Europe',
    'asia': '#Asia',
    'middle_east': '#MiddleEast'
  };

  return base + (regionTags[story.region] || '');
}

async function generateScript(story) {
  try {
    const prompt = `Create a viral TikTok script for: ${story.title}

Keep it under 150 words, start with a hook, explain why it matters globally, end with a question.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 300
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;

  } catch (error) {
    return `🚨 BREAKING: ${story.title}

${story.description.substring(0, 100)}...

This affects millions worldwide. What do you think? 👇`;
  }
}

function simulateTikTokPost(story, script, hashtags) {
  console.log('📱 ========== TIKTOK SIMULATION ==========');
  console.log(`📰 Title: ${story.title}`);
  console.log(`🌍 Region: ${story.region}`);
  console.log(`📝 Script: ${script.substring(0, 100)}...`);
  console.log(`🏷️ Hashtags: ${hashtags}`);
  console.log('✅ Ready to post to TikTok!');
  console.log('==========================================');
}

// API Routes
app.get('/', (req, res) => {
  res.json({
    status: 'Global News TikTok Bot - WORKING',
    lastRun: global.lastRun || 'Not run yet',
    countries: countries.length,
    rssSources: Object.keys(rssSources).length,
    postsGenerated: global.latestPosts ? global.latestPosts.length : 0
  });
});

app.get('/posts', (req, res) => {
  res.json({
    success: true,
    posts: global.latestPosts || [],
    total: global.latestPosts ? global.latestPosts.length : 0
  });
});

app.post('/trigger', async (req, res) => {
  try {
    await runNewsAutomation();
    res.json({ success: true, message: 'News cycle completed!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run every 2 hours
cron.schedule('0 */2 * * *', runNewsAutomation);

app.listen(PORT, () => {
  console.log(`🚀 Global News Bot running on port ${PORT}`);
  console.log(`🌍 Countries: ${countries.length}, RSS: ${Object.keys(rssSources).length}`);

  // Run test on startup
  if (NEWSAPI_KEY && GROQ_API_KEY) {
    console.log('🔑 API keys found, starting automation in 5 seconds...');
    setTimeout(runNewsAutomation, 5000);
  } else {
    console.log('⚠️  Add NEWSAPI_KEY and GROQ_API_KEY to environment variables');
  }
});
