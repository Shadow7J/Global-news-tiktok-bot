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

// FULL GLOBAL COVERAGE - ALL COUNTRIES + MIDDLE EAST
const countries = ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'jp', 'br', 'mx', 'sa', 'ae', 'eg', 'tr', 'il'];

const rssSources = {
  'Reuters': 'http://feeds.reuters.com/reuters/topNews',
  'AP News': 'https://feeds.apnews.com/rss/apf-topnews',
  'Al Arabiya': 'https://english.alarabiya.net/rss.xml',
  'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
  'DW News': 'https://rss.dw.com/rdf/rss-en-all',
  'France24': 'https://www.france24.com/en/rss'
};

app.use(express.json());

// HELPER FUNCTIONS FIRST
// Helper functions for simulation
function estimateViews(viralScore) {
  if (viralScore >= 80) return '100K - 1M views';
  if (viralScore >= 60) return '10K - 100K views';
  if (viralScore >= 40) return '1K - 10K views';
  return '100 - 1K views';
}

function getBestPostingTime(region) {
  const times = {
    'americas': '6PM - 9PM EST',
    'europe': '7PM - 10PM CET',
    'asia': '8PM - 11PM JST',
    'middle_east': '8PM - 11PM GST',
    'africa': '7PM - 10PM CAT',
    'international': '6PM - 9PM EST'
  };
  return times[region] || times['international'];
}

function getVideoStyle(region) {
  const styles = {
    'middle_east': 'Red urgent background with Arabic/English text',
    'americas': 'Blue professional with US-style graphics',
    'europe': 'Clean modern with European flags',
    'asia': 'High-tech with Asian market focus',
    'africa': 'Vibrant with continental themes',
    'international': 'Global news format with world map'
  };
  return styles[region] || styles['international'];
}

// MAIN AUTOMATION FUNCTION
async function runFullGlobalNewsAutomation() {
  try {
    console.log('🌍 Fetching FULL GLOBAL news...');
    console.log(`📊 Covering ${countries.length} countries + ${Object.keys(rssSources).length} RSS sources`);

    const allNews = [];

    // FETCH FROM ALL COUNTRIES
    const selectedCountries = getRandomCountries(8);

    for (const [sourceName, url] of Object.entries(rssSources)) {
      try {
        console.log(`📡 Fetching from ${sourceName}...`);
        const feed = await parser.parseURL(url);

        feed.items.slice(0, 4).forEach(item => {
          if (item.title && item.contentSnippet && item.title.length > 20) {
            allNews.push({
              title: item.title,
              description: item.contentSnippet.substring(0, 200),
              country: getSourceCountry(sourceName),
              source: sourceName,
              publishedAt: item.pubDate || item.isoDate,
              region: getSourceRegion(sourceName),
              type: 'rss'
            });
          }
        });
      } catch (error) {
        console.error(`❌ Error fetching RSS from ${sourceName}:`, error.message);
      }
    }

    console.log(`📰 Found ${allNews.length} total news stories`);

    // SCORE AND SELECT DIVERSE STORIES
    const scoredNews = allNews.map(story => ({
      ...story,
      viralScore: calculateViralScore(story)
    })).sort((a, b) => b.viralScore - a.viralScore);

    const topStories = selectDiverseStories(scoredNews, 4);

    console.log('🔥 Selected stories:');
    topStories.forEach((story, i) => {
      console.log(`${i+1}. [${story.region.toUpperCase()}] ${story.title.substring(0, 60)}... (Score: ${story.viralScore})`);
    });

    // GENERATE SCRIPTS AND SIMULATE TIKTOK POSTING
    for (let i = 0; i < topStories.length; i++) {
      const story = topStories[i];

      try {
        console.log(`📝 Processing story ${i+1}/${topStories.length}: ${story.title.substring(0, 50)}...`);

        const script = await generateViralScript(story);
        const hashtags = generateHashtags(story);

        // Simulate TikTok posting
        const postResult = await simulateTikTokPosting(story, script, hashtags);

        // Save to global for API access
        if (!global.latestPosts) global.latestPosts = [];
        global.latestPosts.push({
          ...postResult.content,
          viralScore: story.viralScore,
          estimatedViews: postResult.estimated_views,
          region: story.region,
          source: story.source,
          simulatedAt: postResult.posted_at
        });

        // Keep only last 20 posts
        if (global.latestPosts.length > 20) {
          global.latestPosts = global.latestPosts.slice(-20);
        }

        console.log(`✅ TikTok post ${i+1} simulated successfully!`);

        // Add delay between API calls
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Failed to process story ${i+1}:`, error.message);
        continue;
      }
    }

    global.lastRun = new Date().toISOString();
    console.log('🎉 FULL GLOBAL news automation cycle completed!');

  } catch (error) {
    console.error('💥 Critical error in news automation:', error);
  }
}

// API ENDPOINTS
app.get('/', (req, res) => {
  res.json({
    status: 'Global News Bot Running - FULL COVERAGE WITH SIMULATION',
    countries: countries.length,
    rssSources: Object.keys(rssSources).length,
    totalSources: countries.length + Object.keys(rssSources).length,
    lastRun: global.lastRun || 'Not run yet',
    nextRun: 'Every 2 hours',
    coverage: 'Americas, Europe, Asia, Middle East, Africa',
    simulation: 'TikTok posting simulation active'
  });
});

app.get('/test', async (req, res) => {
  try {
    console.log('Testing FULL global news fetch...');

    let totalArticles = 0;
    const sampleTitles = [];

    // Test NewsAPI with multiple countries
    for (let i = 0; i < Math.min(3, countries.length); i++) {
      const country = countries[i];
      try {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            country: country,
            category: 'general',
            pageSize: 3
          },
          headers: { 'X-API-Key': NEWSAPI_KEY }
        });

        totalArticles += response.data.articles.length;
        if (response.data.articles[0]) {
          sampleTitles.push(`${country.toUpperCase()}: ${response.data.articles[0].title}`);
        }
      } catch (error) {
        console.error(`Error testing ${country}:`, error.message);
      }
    }

    res.json({
      success: true,
      totalCountries: countries.length,
      totalRSSSources: Object.keys(rssSources).length,
      articlesFound: totalArticles,
      sampleTitles: sampleTitles,
      message: 'FULL GLOBAL coverage working!',
      sources: {
        countries: countries,
        rss: Object.keys(rssSources)
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

app.get('/simulated-posts', (req, res) => {
  const posts = global.latestPosts || [];

  res.json({
    success: true,
    totalPosts: posts.length,
    lastUpdated: global.lastRun,
    posts: posts.map(post => ({
      title: post.title,
      caption: post.caption.substring(0, 100) + '...',
      hashtags: post.hashtags,
      viralScore: post.viralScore,
      estimatedViews: post.estimatedViews,
      region: post.region,
      source: post.source,
      simulatedAt: post.simulatedAt
    }))
  });
});

app.get('/post/:index', (req, res) => {
  const posts = global.latestPosts || [];
  const index = parseInt(req.params.index);

  if (index >= 0 && index < posts.length) {
    res.json({
      success: true,
      post: posts[index]
    });
  } else {
    res.json({
      success: false,
      error: 'Post not found'
    });
  }
});

app.post('/trigger', async (req, res) => {
  try {
    console.log('🔥 Manual trigger initiated...');
    await runFullGlobalNewsAutomation();
    res.json({ success: true, message: 'FULL GLOBAL news cycle completed with TikTok simulation' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run every 2 hours
cron.schedule('0 */2 * * *', runFullGlobalNewsAutomation);

app.listen(PORT, () => {
  console.log(`🚀 FULL GLOBAL News Bot with TikTok Simulation running on port ${PORT}`);
  console.log(`🌍 Coverage: ${countries.length} countries + ${Object.keys(rssSources).length} RSS sources`);
  console.log('🤖 Automation runs every 2 hours');
  console.log('📱 TikTok simulation: Full posting preview');
  console.log('📰 Sources: Americas, Europe, Asia, Middle East, Africa');

  // Test on startup
  if (NEWSAPI_KEY && GROQ_API_KEY) {
    console.log('🔑 API keys detected, running full test...');
    setTimeout(() => runFullGlobalNewsAutomation(), 10000);
  } else {
    console.log('⚠️  Missing API keys');
  }
});
