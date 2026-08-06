import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// A promotion's media lives in `imageUrl`; it may actually be a video. The native
// <Image> only renders a torn, half-decoded frame on iOS and nothing on Android,
// so video URLs must be played with expo-video instead. Shared by the stories
// carousel and the hero banner so both surfaces play video identically to the website.
const VIDEO_URL_RE = /\.(mp4|m4v|mov|webm|m3u8|3gp|mkv)(\?.*)?$/i;
export const isVideoUrl = (url) => typeof url === 'string' && VIDEO_URL_RE.test(url);

// Media uploaded through UploadThing is served from an opaque, extensionless URL
// (…/f/<id>), so the regex above classifies every video as an image. The server
// resolves the real type into `mediaType`, but records saved before that existed
// arrive without it — probe the Content-Type once per URL and reuse the answer.
const probeCache = new Map(); // uri -> 'video' | 'image'

function useMediaKind(uri, mediaType) {
  const known =
    mediaType === 'video' || mediaType === 'image'
      ? mediaType
      : isVideoUrl(uri)
      ? 'video'
      : probeCache.get(uri);

  const [kind, setKind] = useState(known);

  useEffect(() => {
    if (known) { setKind(known); return undefined; }
    if (!uri) { setKind('image'); return undefined; }

    let cancelled = false;
    fetch(uri, { method: 'HEAD' })
      .then((r) => ((r.headers.get('content-type') || '').startsWith('video/') ? 'video' : 'image'))
      .catch(() => 'image') // unreachable → assume image, <Image> degrades quietly
      .then((resolved) => {
        probeCache.set(uri, resolved);
        if (!cancelled) setKind(resolved);
      });

    return () => { cancelled = true; };
  }, [uri, known]);

  return kind; // undefined only while a probe is still in flight
}

// Plays a promo video. `muted` story = full sound; bubble/banner preview = silent loop.
export function PromoVideo({ uri, style, muted = false, contentFit = 'cover', paused = false }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  // Only the slide actually on screen plays. Several decoders running at once
  // exhausts the phone's hardware video pipeline, which is what makes frames
  // tear/band instead of simply dropping.
  useEffect(() => {
    if (!player) return;
    if (paused) player.pause();
    else player.play();
  }, [player, paused]);

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

// Picks a video player or an <Image> based on the media's real type.
export function PromoMedia({
  uri, style, muted, contentFit, resizeMode = 'cover', mediaType, paused = false,
}) {
  const kind = useMediaKind(uri, mediaType);

  // Hold a blank frame until the type is known — handing an MP4 to <Image> is
  // exactly what renders the corrupted, striped frame this guards against.
  if (!kind) return <View style={style} />;

  if (kind === 'video') {
    return (
      <PromoVideo
        key={uri}
        uri={uri}
        style={style}
        muted={muted}
        contentFit={contentFit}
        paused={paused}
      />
    );
  }
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
