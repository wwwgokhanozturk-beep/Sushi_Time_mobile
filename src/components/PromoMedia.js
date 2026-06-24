import React from 'react';
import { Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// A promotion's media lives in `imageUrl`; it may actually be a video. The native
// <Image> only renders a still frame on iOS and nothing on Android, so video URLs
// must be played with expo-video instead. Shared by the stories carousel and the
// hero banner so both surfaces play video identically to the website.
const VIDEO_URL_RE = /\.(mp4|m4v|mov|webm|m3u8|3gp|mkv)(\?.*)?$/i;
export const isVideoUrl = (url) => typeof url === 'string' && VIDEO_URL_RE.test(url);

// Plays a promo video. `muted` story = full sound; bubble/banner preview = silent loop.
export function PromoVideo({ uri, style, muted = false, contentFit = 'cover' }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });
  return (
    <VideoView
      style={style}
      player={player}
      contentFit={contentFit}
      nativeControls={false}
      allowsFullscreen={false}
      pointerEvents="none"
    />
  );
}

// Picks a video player or an <Image> based on the media URL.
export function PromoMedia({ uri, style, muted, contentFit, resizeMode = 'cover' }) {
  if (isVideoUrl(uri)) {
    return <PromoVideo key={uri} uri={uri} style={style} muted={muted} contentFit={contentFit} />;
  }
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
