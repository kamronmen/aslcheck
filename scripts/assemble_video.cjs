const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ffmpegPath = 'C:\\Users\\KAMRON\\AppData\\Local\\CapCut\\Apps\\9.6.0.4097\\ffmpeg.exe';
const assetsDir = path.resolve('video_assets');

function main() {
  const timingsPath = path.join(assetsDir, 'timings.json');
  const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));

  // 1. Create ffmpeg concat file for audio
  const concatListPath = path.join(assetsDir, 'audio_concat.txt');
  const concatLines = timings.map(t => {
    const safePath = t.file.replace(/\\/g, '/');
    return `file '${safePath}'`;
  });
  fs.writeFileSync(concatListPath, concatLines.join('\n'));
  console.log('Created audio concat list:', concatListPath);

  // Concatenate audio files into full_narration.wav
  const fullAudioPath = path.join(assetsDir, 'full_narration.wav');
  console.log('Concatenating audio clips with ffmpeg...');
  const audioRes = spawnSync(ffmpegPath, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c', 'copy',
    fullAudioPath
  ]);

  if (audioRes.status !== 0 || !fs.existsSync(fullAudioPath)) {
    console.error('Audio concat failed:', audioRes.stderr?.toString());
    process.exit(1);
  }
  console.log('full_narration.wav created! Size:', fs.statSync(fullAudioPath).size);

  // 2. Find raw video
  const rawVideoDir = path.join(assetsDir, 'raw_video');
  const videoFiles = fs.readdirSync(rawVideoDir).filter(f => f.endsWith('.webm'));
  if (videoFiles.length === 0) {
    console.error('No raw webm found in', rawVideoDir);
    process.exit(1);
  }
  const rawVideoPath = path.join(rawVideoDir, videoFiles[0]);
  console.log('Using raw video:', rawVideoPath);

  // 3. Mux into final MP4 with explicit stream mapping, high-bitrate H.264 and AAC audio
  const finalMp4Path = path.resolve('aslcheck-pro-demo-16x9.mp4');
  console.log('Muxing final 16:9 MP4 (H.264 Full HD + AAC Voiceover)...');
  const muxRes = spawnSync(ffmpegPath, [
    '-y',
    '-i', rawVideoPath,
    '-i', fullAudioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'h264_mf',
    '-b:v', '4000k',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    finalMp4Path
  ]);

  if (muxRes.status !== 0 || !fs.existsSync(finalMp4Path)) {
    console.error('Mux failed:', muxRes.stderr?.toString());
    process.exit(1);
  }

  const finalSizeMb = (fs.statSync(finalMp4Path).size / (1024 * 1024)).toFixed(2);
  console.log(`SUCCESS! Final MP4 created at: ${finalMp4Path} (${finalSizeMb} MB)`);

  // Copy to Desktop
  const desktopPath = path.join(process.env.USERPROFILE || 'C:\\Users\\KAMRON', 'Desktop', 'aslcheck-pro-demo-16x9.mp4');
  try {
    fs.copyFileSync(finalMp4Path, desktopPath);
    console.log(`Copied directly to User Desktop: ${desktopPath}`);
  } catch (e) {
    console.warn('Could not copy to Desktop:', e.message);
  }

  // Clean up temporary test file
  if (fs.existsSync('test_audio_mux.mp4')) {
    fs.unlinkSync('test_audio_mux.mp4');
  }
}

main();
