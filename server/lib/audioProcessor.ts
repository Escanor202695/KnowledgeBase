import OpenAI from 'openai';
import { createReadStream } from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio file using OpenAI Whisper
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    console.log(`🎤 Transcribing audio file: ${filePath}`);
    
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'text',
    });
    
    console.log(`✅ Transcription complete (${transcription.length} characters)`);
    return transcription;
  } catch (error: any) {
    console.error('❌ Whisper transcription error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Get duration of audio file (placeholder - would need ffprobe or similar)
 * For now, we'll estimate based on file size
 */
export function estimateAudioDuration(fileSize: number): number {
  // Rough estimate: ~1MB per minute for compressed audio
  const estimatedMinutes = fileSize / (1024 * 1024);
  return Math.round(estimatedMinutes * 60); // Convert to seconds
}

/**
 * Generate a title from audio filename
 */
export function generateAudioTitle(filename: string): string {
  // Remove extension and clean up filename
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim();
}
