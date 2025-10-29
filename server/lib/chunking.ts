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

export function createChunks(
  transcript: TranscriptSegment[]
): ChunkData[] {
  const CHUNK_SIZE = 1200;  // characters
  const OVERLAP = 200;      // characters

  const chunks: ChunkData[] = [];
  let currentChunk = '';
  let chunkStartTime = 0;
  let chunkIndex = 0;

  for (let i = 0; i < transcript.length; i++) {
    const segment = transcript[i];
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
