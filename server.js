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

app.get('/', (req, res) => {
  res.json({
    status: 'Global News Bot Running - FULL COVERAGE',
    countries: countries.length,
    rssSources: Object.keys(rssSources).length,
    totalSources: countries.length + Object.keys(rssSources).length,
    lastRun: global.lastRun || 'Not run yet',
    nextRun: 'Every 2 hours',
    coverage: 'Americas, Europe, Asia, Middle East, Africa'
  });
});

// Test endpoint
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

    // Test RSS sources
    for (const [sourceName, url] of Object.entries(rssSources)) {
      try {
        const feed = await parser.parseURL(url);
        totalArticles += Math.min(3, feed.items.length);
        if (feed.items[0]) {
          sampleTitles.push(`${sourceName}: ${feed.items[0].title.substring(0, 60)}...`);
        }
        break; // Test just one RSS for speed
      } catch (error) {
        console.error(`Error testing ${sourceName}:`, error.message);
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

// FULL GLOBAL NEWS AUTOMATION
async function runFullGlobalNewsAutomation() {
  try {
    console.log('🌍 Fetching FULL GLOBAL news...');
    console.log(`📊 Covering ${countries.length} countries + ${Object.keys(rssSources).length} RSS sources`);

    const allNews = [];

    // FETCH FROM ALL COUNTRIES
    const selectedCountries = getRandomCountries(8); // Rotate 8 countries per cycle

    for (const country of selectedCountries) {
      try {
        console.log(`🏴 Fetching from ${country.toUpperCase()}...`);

        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            country: country,
            category: 'general',
            pageSize: 3,
            sortBy: 'publishedAt'
          },
          headers: { 'X-API-Key': NEWSAPI_KEY }
        });

        if (response.data.articles) {
          response.data.articles.forEach(article => {
            if (article.title && article.description && article.title.length > 20) {
              allNews.push({
                title: article.title,
                description: article.description,
                country: country,
                source: article.source.name,
                publishedAt: article.publishedAt,
                region: getRegion(country),
                type: 'api'
              });
            }
          });
        }
      } catch (error) {
        console.error(`❌ Error fetching from ${country}:`, error.message);
      }
    }

    // FETCH FROM ALL RSS SOURCES (INCLUDING MIDDLE EAST)
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

    // SELECT DIVERSE STORIES FROM DIFFERENT REGIONS
    const topStories = selectDiverseStories(scoredNews, 4);

    console.log('🔥 Selected stories:');
    topStories.forEach((story, i) => {
      console.log(`${i+1}. [${story.region.toUpperCase()}] ${story.title.substring(0, 60)}... (Score: ${story.viralScore})`);
    });
// After generating each script, add:
if (!global.latestScripts) global.latestScripts = [];
global.latestScripts.push({
  title: story.title,
  script: script,
  hashtags: hashtags,
  region: story.region,
  viralScore: story.viralScore,
  generatedAt: new Date().toISOString()
});

// Keep only last 10 scripts
if (global.latestScripts.length > 10) {
  global.latestScripts = global.latestScripts.slice(-10);
}
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

    // Wait between posts to avoid spam simulation
    if (i < topStories.length - 1) {
      console.log('⏱️ Waiting 30 seconds before next post simulation...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

  } catch (error) {
    console.error(`❌ Failed to process story ${i+1}:`, error.message);
    continue;
  }
}
        
// Add delay between API calls to avoid rate limits
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
        // Add this new endpoint
app.get('/latest-content', (req, res) => {
  res.json({
    message: 'Latest generated content ready for TikTok',
    status: 'Content generation working perfectly',
    nextStep: 'Add TikTok posting automation',
    sampleContent: global.latestScripts || []
  });
});
    // View latest simulated TikTok posts
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

// Get full details of a specific post
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
        // TODO: Here you would create video and post to TikTok

      } catch (error) {
        console.error(`❌ Failed to process story ${i+1}:`, error.message);
      }
    }

    global.lastRun = new Date().toISOString();
    console.log('🎉 FULL GLOBAL news automation cycle completed!');

  } catch (error) {
    console.error('💥 Critical error in news automation:', error);
  }
}

// HELPER FUNCTIONS
function getRandomCountries(count) {
  const shuffled = [...countries].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRegion(country) {
  const regions = {
    'us': 'americas', 'ca': 'americas', 'br': 'americas', 'mx': 'americas',
    'gb': 'europe', 'de': 'europe', 'fr': 'europe', 'tr': 'europe',
    'jp': 'asia', 'in': 'asia', 'au': 'asia',
    'sa': 'middle_east', 'ae': 'middle_east', 'eg': 'middle_east', 'il': 'middle_east',
    'za': 'africa', 'ng': 'africa'
  };
  return regions[country] || 'international';
}

function getSourceCountry(sourceName) {
  const sourceCountries = {
    'Reuters': 'global',
    'AP News': 'us',
    'Al Arabiya': 'ae',
    'Al Jazeera': 'qa',
    'DW News': 'de',
    'France24': 'fr'
  };
  return sourceCountries[sourceName] || 'global';
}

function getSourceRegion(sourceName) {
  const sourceRegions = {
    'Reuters': 'international',
    'AP News': 'americas',
    'Al Arabiya': 'middle_east',
    'Al Jazeera': 'middle_east',
    'DW News': 'europe',
    'France24': 'europe'
  };
  return sourceRegions[sourceName] || 'international';
}

function calculateViralScore(story) {
  let score = 0;

  // Recency boost
  const hoursOld = story.publishedAt ?
    (Date.now() - new Date(story.publishedAt)) / (1000 * 60 * 60) : 24;

  if (hoursOld < 1) score += 50;
  else if (hoursOld < 6) score += 30;
  else if (hoursOld < 12) score += 15;

  // Global impact keywords
  const globalKeywords = [
    'breaking', 'urgent', 'crisis', 'war', 'conflict', 'economy', 'market',
    'international', 'global', 'world', 'historic', 'unprecedented'
  ];

  const text = (story.title + ' ' + story.description).toLowerCase();
  globalKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 15;
  });

  // Middle East specific boost
  const middleEastKeywords = ['israel', 'palestine', 'saudi', 'iran', 'syria', 'iraq', 'yemen'];
  middleEastKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 10;
  });

  // Source credibility boost
  const credibleSources = ['Reuters', 'AP News', 'Al Arabiya', 'Al Jazeera'];
  if (credibleSources.includes(story.source)) {
    score += 20;
  }

  return score;
}

function selectDiverseStories(news, count) {
  const selected = [];
  const regions = ['americas', 'europe', 'asia', 'middle_east', 'africa', 'international'];
  const usedRegions = new Set();

  // Try to get stories from different regions
  for (const story of news) {
    if (selected.length >= count) break;

    const region = story.region;
    if (!usedRegions.has(region) || selected.length < regions.length) {
      selected.push(story);
      usedRegions.add(region);
    }
  }

  // Fill remaining slots
  while (selected.length < count && news.length > selected.length) {
    const remaining = news.filter(story => !selected.includes(story));
    if (remaining.length > 0) {
      selected.push(remaining[0]);
    } else {
      break;
    }
  }

  return selected;
}

function generateHashtags(story) {
  const countryTags = {
    'us': '#USA', 'gb': '#UK', 'ca': '#Canada', 'au': '#Australia',
    'de': '#Germany', 'fr': '#France', 'jp': '#Japan', 'in': '#India',
    'br': '#Brazil', 'mx': '#Mexico', 'sa': '#SaudiArabia', 'ae': '#UAE',
    'eg': '#Egypt', 'tr': '#Turkey', 'il': '#Israel', 'qa': '#Qatar'
  };

  const regionTags = {
    'americas': '#Americas',
    'europe': '#Europe',
    'asia': '#Asia',
    'middle_east': '#MiddleEast',
    'africa': '#Africa',
    'international': '#International'
  };

  let hashtags = '#worldnews #global #breaking #fyp #viral #trending';

  if (countryTags[story.country]) {
    hashtags += ` ${countryTags[story.country]}`;
  }

  if (regionTags[story.region]) {
    hashtags += ` ${regionTags[story.region]}`;
  }

  return hashtags;
}

async function generateViralScript(story) {
  try {
    const prompt = `Create a viral 60-second TikTok script for this global news story:

TITLE: ${story.title}
DESCRIPTION: ${story.description}
REGION: ${story.region}
SOURCE: ${story.source}

Requirements:
- Start with urgent hook in first 3 seconds
- Explain WHY this matters globally
- Keep conversational and engaging 
- Under 150 words total
- Include emotional connection
- End with question to boost comments

Make it sound like a real person talking, not robotic.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 350,
      temperature: 0.8
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Script generation error:', error.message);
    return `🚨 BREAKING: ${story.title}

This just happened and it's affecting millions worldwide. Here's what you need to know: ${story.description.substring(0, 100)}...

This matters because it could impact global politics, economy, and your daily life.

What's your take on this? Drop your thoughts below! 👇`;
  }
}

// Manual trigger
app.post('/trigger', async (req, res) => {
  try {
    console.log('🔥 Manual trigger initiated...');
    await runFullGlobalNewsAutomation();
    res.json({ success: true, message: 'FULL GLOBAL news cycle completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run every 2 hours
cron.schedule('0 */2 * * *', runFullGlobalNewsAutomation);

app.listen(PORT, () => {
  console.log(`🚀 FULL GLOBAL News Bot running on port ${PORT}`);
  console.log(`🌍 Coverage: ${countries.length} countries + ${Object.keys(rssSources).length} RSS sources`);
  console.log('🤖 Automation runs every 2 hours');
  console.log('📰 Sources: Americas, Europe, Asia, Middle East, Africa');

  // Test on startup
  if (NEWSAPI_KEY && GROQ_API_KEY) {
    console.log('🔑 API keys detected, running full test...');
    setTimeout(() => runFullGlobalNewsAutomation(), 10000);
  } else {
    console.log('⚠️  Missing API keys');
  }
});
// TikTok Posting Simulation
async function simulateTikTokPosting(story, script, hashtags) {
  console.log('📱 ========== TIKTOK POST SIMULATION ==========');
  console.log('🎬 VIDEO CONTENT:');
  console.log(`Title: ${story.title}`);
  console.log(`Region: ${story.region.toUpperCase()}`);
  console.log(`Source: ${story.source}`);
  console.log(`Country: ${story.country.toUpperCase()}`);
  console.log('');

  console.log('📝 CAPTION:');
  console.log(script);
  console.log('');

  console.log('🏷️ HASHTAGS:');
  console.log(hashtags);
  console.log('');

  console.log('📊 ENGAGEMENT METRICS:');
  console.log(`Viral Score: ${story.viralScore}/100`);
  console.log(`Expected Views: ${estimateViews(story.viralScore)}`);
  console.log(`Best Posting Time: ${getBestPostingTime(story.region)}`);
  console.log('');

  console.log('🎥 VIDEO DETAILS:');
  console.log(`Duration: 60 seconds`);
  console.log(`Style: Breaking news format`);
  console.log(`Background: ${getVideoStyle(story.region)}`);
  console.log(`Voice: AI news anchor`);
  console.log('');

  console.log('✅ READY TO POST TO TIKTOK!');
  console.log('==========================================');
  console.log('');

  return {
    success: true,
    platform: 'TikTok',
    posted_at: new Date().toISOString(),
    estimated_views: estimateViews(story.viralScore),
    content: {
      title: story.title,
      caption: script,
      hashtags: hashtags,
      duration: 60,
      style: getVideoStyle(story.region)
    }
  };
}

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
