const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure directories exist
if (!fs.existsSync('./videos')) fs.mkdirSync('./videos');
if (!fs.existsSync('./audio')) fs.mkdirSync('./audio');

async function generateVideo(story, script, audioPath) {
  const videoId = uuidv4();
  const outputPath = `./videos/news_${videoId}.mp4`;

  return new Promise((resolve, reject) => {
    console.log('🎬 Creating video...');

    // Choose background color based on region/category
    const backgrounds = {
      'middle_east': '#8B0000', // Dark red
      'conflict': '#B22222',    // Fire brick
      'economy': '#2E8B57',     // Sea green 
      'politics': '#4682B4',    // Steel blue
      'default': '#DC143C'      // Crimson
    };

    const bgColor = backgrounds[story.region] || backgrounds[story.category] || backgrounds.default;

    // Clean text for video overlay
    const cleanTitle = story.title.replace(/['"]/g, '').substring(0, 60);
    const cleanSource = story.source.substring(0, 20);
    const regionText = story.region.replace('_', ' ').toUpperCase();

    let command = ffmpeg()
      .input(`color=c=${bgColor}:size=720x1280:duration=60:rate=30`)
      .inputFormat('lavfi');

    // Add audio if available
    if (audioPath && fs.existsSync(audioPath)) {
      command = command.input(audioPath);
    }

    command
      .complexFilter([
        // Main breaking news banner
        `drawtext=text='🚨 BREAKING NEWS':x=(w-text_w)/2:y=80:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.9:boxborderw=8`,

        // Region indicator
        `drawtext=text='${regionText}':x=(w-text_w)/2:y=160:fontsize=24:fontcolor=yellow:box=1:boxcolor=black@0.7`,

        // Main headline (wrapped)
        `drawtext=text='${cleanTitle}':x=20:y=300:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.8:boxborderw=5:fontfile=/System/Library/Fonts/Arial.ttf`,

        // Source attribution
        `drawtext=text='Source: ${cleanSource}':x=20:y=1150:fontsize=18:fontcolor=lightgray:box=1:boxcolor=black@0.6`,

        // Timestamp
        `drawtext=text='%{localtime}':x=w-tw-20:y=1200:fontsize=16:fontcolor=gray`,

        // Hashtag preview
        `drawtext=text='#WorldNews #Global #Breaking':x=20:y=1200:fontsize=16:fontcolor=cyan`
      ])
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
        '-t 60',
        '-r 30'
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Video progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ Video created successfully:', outputPath);

        // Clean up audio file
        if (audioPath && fs.existsSync(audioPath)) {
          try {
            fs.unlinkSync(audioPath);
            console.log('🗑️ Cleaned up audio file');
          } catch (error) {
            console.log('Warning: Could not clean up audio file');
          }
        }

        resolve(outputPath);
      })
      .on('error', (error) => {
        console.error('❌ Video generation failed:', error);
        reject(error);
      })
      .run();
  });
}

module.exports = { generateVideo };
