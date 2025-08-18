javascript
const express = require('express');
const cron = require('node-cron');
const { runNewsAutomation } = require('./news-automation');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'Global News TikTok Bot Running',
    lastRun: global.lastRun || 'Not run yet',
    nextRun: 'Every 2 hours',
    sources: 'Global + Middle East coverage'
  });
});

// Run every 2 hours
cron.schedule('0 */2 * * *', async () => {
  console.log('🌍 Starting global news automation cycle...');
  try {
    await runNewsAutomation();
    global.lastRun = new Date().toISOString();
    console.log('✅ News cycle completed successfully');
  } catch (error) {
    console.error('❌ Automation failed:', error);
  }
});

// Manual trigger endpoint
app.post('/trigger', async (req, res) => {
  try {
    console.log('🔥 Manual trigger initiated...');
    await runNewsAutomation();
    res.json({ success: true, message: 'News cycle started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Global News TikTok Bot running on port ${PORT}`);
  console.log('🤖 Automation runs every 2 hours');
  console.log('🌍 Coverage: Worldwide + Middle East');
});
