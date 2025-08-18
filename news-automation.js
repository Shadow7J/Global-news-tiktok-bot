const axios = require('axios');
const Parser = require('rss-parser');
const { postToTikTok } = require('./tiktok-poster');
const { generateVideo } = require('./video-generator');

const parser = new Parser();

// API Keys from environment
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_KEY;

// Global countries including Middle East
const countries = ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'jp', 'br', 'mx', 'sa', 'ae', 'eg', 'tr', 'il'];

// RSS Sources with Middle East coverage
const rssSources = {
  reuters: 'http://feeds.reuters.com/reuters/topNews',
  ap_news: 'https://feeds.apnews.com/rss/apf-topnews',
  al_arabiya: 'https://english.alarabiya.net/rss.xml',
  al_jazeera: 'https://www.aljazeera.com/xml/rss/all.xml',
  dw_news: 'https://rss.dw.com/rdf/rss-en-all',
  france24: 'https://www.france24.com/en/rss'
};

async function runNewsAutomation() {
  try {
    console.log('📰 Fetching global news...');

    // 1. Fetch from multiple sources
    const allNews = [];

    // API sources
    const apiNews = await fetchFromAPIs();
    allNews.push(...apiNews);

    // RSS sources (including Middle East)
    const rssNews = await fetchFromRSS();
    allNews.push(...rssNews);

    // 2. Process and score news
    const processedNews = processNewsData(allNews);

    // 3. Select top stories across regions
    const topStories = selectDiverseStories(processedNews, 3);

    console.log(`🔥 Selected ${topStories.length} top stories for TikTok`);

    // 4. Create and post videos
    for (let i = 0; i < topStories.length; i++) {
      const story = topStories[i];

      try {
        console.log(`📱 Creating video ${i+1}: ${story.title.substring(0, 50)}...`);

        // Generate script
        const script = await generateViralScript(story);

        // Generate voice
        const audioPath = await generateVoice(script);

        // Create video
        const videoPath = await generateVideo(story, script, audioPath);

        // Post to TikTok
        await postToTikTok(videoPath, script, story.hashtags);

        console.log(`✅ Posted story ${i+1} to TikTok`);

        // Wait 15 minutes between posts to avoid spam
        if (i < topStories.length - 1) {
          console.log('⏱️  Waiting 15 minutes before next post...');
          await sleep(900000); // 15 minutes
        }

      } catch (error) {
        console.error(`❌ Failed to process story ${i+1}:`, error);
        continue;
      }
    }

    console.log('🎉 Global news automation cycle completed!');

  } catch (error) {
    console.error('💥 Critical error in news automation:', error);
    throw error;
  }
}

async function fetchFromAPIs() {
  const news = [];

  // Rotate through countries (5 per cycle)
  const selectedCountries = getRandomCountries(5);

  for (const country of selectedCountries) {
    try {
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          country: country,
          category: 'general',
          pageSize: 5,
          sortBy: 'publishedAt'
        },
        headers: { 'X-API-Key': NEWSAPI_KEY }
      });

      if (response.data.articles) {
        response.data.articles.forEach(article => {
          if (article.title && article.description && article.title.length > 20) {
            news.push({
              title: article.title,
              description: article.description,
              url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt,
              country: country,
              type: 'api'
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching from ${country}:`, error.message);
    }
  }

  return news;
}

async function fetchFromRSS() {
  const news = [];

  for (const [sourceName, url] of Object.entries(rssSources)) {
    try {
      console.log(`📡 Fetching from ${sourceName}...`);
      const feed = await parser.parseURL(url);

      feed.items.slice(0, 5).forEach(item => {
        if (item.title && item.contentSnippet && item.title.length > 20) {
          news.push({
            title: item.title,
            description: item.contentSnippet || item.summary || '',
            url: item.link,
            source: sourceName.replace('_', ' ').toUpperCase(),
            publishedAt: item.pubDate || item.isoDate,
            country: getSourceCountry(sourceName),
            type: 'rss'
          });
        }
      });
    } catch (error) {
      console.error(`Error fetching RSS from ${sourceName}:`, error.message);
    }
  }

  return news;
}

function processNewsData(allNews) {
  return allNews.map(story => ({
    ...story,
    viralScore: calculateViralScore(story),
    category: detectCategory(story),
    hashtags: generateHashtags(story),
    region: getRegion(story.country)
  })).sort((a, b) => b.viralScore - a.viralScore);
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

  // Emotional triggers
  const emotionalWords = ['shocking', 'incredible', 'massive', 'historic', 'dramatic'];
  emotionalWords.forEach(word => {
    if (text.includes(word)) score += 10;
  });

  // Source credibility boost
  const credibleSources = ['reuters', 'ap_news', 'al_arabiya', 'al_jazeera'];
  if (credibleSources.includes(story.source.toLowerCase().replace(' ', '_'))) {
    score += 20;
  }

  return score;
}

function selectDiverseStories(news, count) {
  const selected = [];
  const regions = ['americas', 'europe', 'asia', 'middle_east', 'africa'];
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

  // Fill remaining slots with highest scoring stories
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

async function generateViralScript(story) {
  try {
    const prompt = `Create a viral 60-second TikTok script for this global news story:

TITLE: ${story.title}
DESCRIPTION: ${story.description}
REGION: ${story.region}
SOURCE: ${story.source}

Requirements:
- Start with an urgent hook in first 3 seconds
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
    console.error('Script generation error:', error);
    // Fallback script
    return `🚨 BREAKING: ${story.title}

This just happened and it's affecting millions worldwide. Here's what you need to know: ${story.description.substring(0, 100)}...

This matters because it could impact global politics, economy, and your daily life.

What's your take on this? Drop your thoughts below! 👇`;
  }
}

async function generateVoice(script) {
  try {
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        text: script.replace(/[🚨🌍💰🏛️⚡🔥👇]/g, ''), // Remove emojis for TTS
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    const audioPath = `./audio/voice_${Date.now()}.mp3`;
    require('fs').writeFileSync(audioPath, response.data);

    return audioPath;

  } catch (error) {
    console.error('Voice generation error:', error);
    return null;
  }
}

// Helper functions
function getRandomCountries(count) {
  const shuffled = [...countries].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getSourceCountry(sourceName) {
  const sourceCountries = {
    'reuters': 'global',
    'ap_news': 'us',
    'al_arabiya': 'ae',
    'al_jazeera': 'qa',
    'dw_news': 'de',
    'france24': 'fr'
  };
  return sourceCountries[sourceName] || 'global';
}

function getRegion(country) {
  const regions = {
    'us': 'americas', 'ca': 'americas', 'br': 'americas', 'mx': 'americas',
    'gb': 'europe', 'de': 'europe', 'fr': 'europe', 'tr': 'europe',
    'jp': 'asia', 'in': 'asia', 'au': 'asia',
    'sa': 'middle_east', 'ae': 'middle_east', 'eg': 'middle_east', 'il': 'middle_east', 'qa': 'middle_east',
    'za': 'africa', 'ng': 'africa',
    'global': 'international'
  };
  return regions[country] || 'international';
}

function detectCategory(story) {
  const text = (story.title + ' ' + story.description).toLowerCase();

  if (text.includes('war') || text.includes('conflict') || text.includes('military')) return 'conflict';
  if (text.includes('economy') || text.includes('market') || text.includes('financial')) return 'economy';
  if (text.includes('election') || text.includes('political') || text.includes('government')) return 'politics';
  if (text.includes('climate') || text.includes('environment')) return 'environment';
  if (text.includes('technology') || text.includes('ai') || text.includes('tech')) return 'technology';
  if (text.includes('health') || text.includes('medical')) return 'health';

  return 'general';
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
    'africa': '#Africa'
  };

  const categoryTags = {
    'conflict': '#conflict #war',
    'economy': '#economy #market',
    'politics': '#politics #government',
    'technology': '#tech #innovation'
  };

  let hashtags = '#worldnews #global #breaking #fyp #viral #trending';

  if (countryTags[story.country]) {
    hashtags += ` ${countryTags[story.country]}`;
  }

  if (regionTags[story.region]) {
    hashtags += ` ${regionTags[story.region]}`;
  }

  if (categoryTags[story.category]) {
    hashtags += ` ${categoryTags[story.category]}`;
  }

  return hashtags;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { runNewsAutomation };
