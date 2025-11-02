export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,  // Regular videos (with optional www.)
    /youtu\.be\/([^&\n?#]+)/,  // Short youtu.be links
    /youtube\.com\/embed\/([^&\n?#]+)/,  // Embed URLs
    /(?:www\.)?youtube\.com\/shorts\/([^&\n?#]+)/,  // YouTube Shorts (with optional www.)
    /^([a-zA-Z0-9_-]{11})$/,  // Raw video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function extractPlaylistId(url: string): string | null {
  // Match playlist URLs: youtube.com/playlist?list=PLxxx or youtube.com/watch?v=xxx&list=PLxxx
  const playlistPatterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of playlistPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function isShortsUrl(url: string): boolean {
  return /(?:www\.)?youtube\.com\/shorts\//.test(url) || /youtu\.be\/[^&\n?#]+/.test(url);
}

export function isPlaylistUrl(url: string): boolean {
  return extractPlaylistId(url) !== null;
}

export function isValidYoutubeUrl(url: string): boolean {
  return extractVideoId(url) !== null || extractPlaylistId(url) !== null;
}

export function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function getYoutubeUrl(videoId: string, timestamp?: number): string {
  const base = `https://youtube.com/watch?v=${videoId}`;
  return timestamp ? `${base}&t=${Math.floor(timestamp)}s` : base;
}
