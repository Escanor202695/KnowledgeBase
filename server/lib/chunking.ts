export interface TranscriptSegment {
  text: string;
  offset: number;  // milliseconds
  duration: number;
}

export interface ChunkData {
  content: string;
  start_time: number;  // seconds
  chunk_index: number;
}

/**
 * Pre-process large text blocks into smaller segments for better chunking
 * This handles documents/text that come as single large strings
 */
function preprocessLargeText(text: string, maxSegmentSize: number = 500): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Split by sentences, capturing trailing text without punctuation
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) || [text];
  
  let currentSegment = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue; // Skip empty segments
    
    // If single sentence is larger than max size, split by words
    if (trimmed.length > maxSegmentSize * 2) {
      const words = trimmed.split(/\s+/);
      let wordChunk = '';
      
      for (const word of words) {
        if (wordChunk.length + word.length + 1 > maxSegmentSize && wordChunk.length > 0) {
          segments.push({
            text: wordChunk.trim(),
            offset: 0,
            duration: 0,
          });
          wordChunk = word;
        } else {
          wordChunk += (wordChunk ? ' ' : '') + word;
        }
      }
      
      if (wordChunk.trim()) {
        segments.push({
          text: wordChunk.trim(),
          offset: 0,
          duration: 0,
        });
      }
    } else if (currentSegment.length + trimmed.length + 1 > maxSegmentSize && currentSegment.length > 0) {
      // Save current segment and start new one
      segments.push({
        text: currentSegment.trim(),
        offset: 0,
        duration: 0,
      });
      currentSegment = trimmed;
    } else {
      // Add to current segment
      currentSegment += (currentSegment ? ' ' : '') + trimmed;
    }
  }
  
  // Add final segment
  if (currentSegment.trim()) {
    segments.push({
      text: currentSegment.trim(),
      offset: 0,
      duration: 0,
    });
  }
  
  return segments.length > 0 ? segments : [{ text: text.substring(0, 1000), offset: 0, duration: 0 }];
}

export function createChunks(
  transcript: TranscriptSegment[]
): ChunkData[] {
  const CHUNK_SIZE = 1200;  // characters
  const OVERLAP = 200;      // characters

  // Pre-process if we have very large single segments (common for documents/text)
  let processedTranscript = transcript;
  if (transcript.length === 1 && transcript[0].text.length > CHUNK_SIZE * 2) {
    processedTranscript = preprocessLargeText(transcript[0].text);
  }

  const chunks: ChunkData[] = [];
  let currentChunk = '';
  let chunkStartTime = 0;
  let chunkIndex = 0;

  for (let i = 0; i < processedTranscript.length; i++) {
    const segment = processedTranscript[i];
    const segmentText = segment.text.trim();

    // Start new chunk
    if (currentChunk === '') {
      chunkStartTime = segment.offset / 1000;  // Convert ms to seconds
    }

    // Check if adding this segment exceeds chunk size
    if (currentChunk.length + segmentText.length + 1 > CHUNK_SIZE && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        start_time: chunkStartTime,
        chunk_index: chunkIndex,
      });

      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - OVERLAP);
      currentChunk = currentChunk.substring(overlapStart) + ' ' + segmentText;
      chunkStartTime = segment.offset / 1000;
      chunkIndex++;
    } else {
      // Add segment to current chunk
      currentChunk += (currentChunk ? ' ' : '') + segmentText;
    }
  }

  // Add final chunk if it exists
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      start_time: chunkStartTime,
      chunk_index: chunkIndex,
    });
  }

  return chunks;
}

export function calculateDuration(transcript: TranscriptSegment[]): number {
  if (transcript.length === 0) return 0;
  const lastSegment = transcript[transcript.length - 1];
  return Math.ceil((lastSegment.offset + lastSegment.duration) / 1000);
}
