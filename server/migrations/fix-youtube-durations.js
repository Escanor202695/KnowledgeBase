/**
 * One-Time Migration: Fix YouTube Video Durations
 * 
 * PROBLEM:
 * youtubei.js returns video duration in MILLISECONDS, but the code was treating
 * it as SECONDS. This caused durations to display incorrectly (e.g., "3940:00:03"
 * instead of "3:56:24").
 * 
 * SOLUTION:
 * 1. Backend fix (server/routes.ts): Convert API duration from ms to seconds
 * 2. Database migration: Fix existing videos by dividing duration by 1000
 * 
 * WHEN TO RUN:
 * This migration was already run on 2025-10-30. Only run again if:
 * - Restoring from a backup taken before the fix
 * - Migrating data from another instance
 * 
 * HOW TO RUN:
 * cd server && node migrations/fix-youtube-durations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixDurations() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    let totalFixed = 0;
    
    // Fix sources collection (YouTube sources)
    console.log('\n📊 Checking sources collection...');
    const sources = await db.collection('sources').find({ source_type: 'youtube' }).toArray();
    console.log(`Found ${sources.length} YouTube sources`);
    
    for (const source of sources) {
      // If duration is > 24 hours (86400 seconds), it's likely in milliseconds
      if (source.duration && source.duration > 86400) {
        const oldDuration = source.duration;
        const newDuration = Math.floor(source.duration / 1000);
        console.log(`\n  Fixing: ${source.title}`);
        console.log(`    Old duration: ${oldDuration} (${Math.floor(oldDuration/3600)} hours)`);
        console.log(`    New duration: ${newDuration} seconds (${Math.floor(newDuration/60)} minutes)`);
        
        await db.collection('sources').updateOne(
          { _id: source._id },
          { $set: { duration: newDuration } }
        );
        totalFixed++;
      }
    }
    
    // Fix videos collection (legacy backwards compatibility)
    console.log('\n📊 Checking videos collection (legacy)...');
    const videos = await db.collection('videos').find({}).toArray();
    console.log(`Found ${videos.length} legacy videos`);
    
    for (const video of videos) {
      if (video.duration && video.duration > 86400) {
        const oldDuration = video.duration;
        const newDuration = Math.floor(video.duration / 1000);
        console.log(`\n  Fixing: ${video.title}`);
        console.log(`    Old duration: ${oldDuration}`);
        console.log(`    New duration: ${newDuration} seconds`);
        
        await db.collection('videos').updateOne(
          { _id: video._id },
          { $set: { duration: newDuration } }
        );
        totalFixed++;
      }
    }
    
    console.log(`\n✅ Migration complete! Fixed ${totalFixed} video(s)`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  fixDurations();
}

module.exports = { fixDurations };
