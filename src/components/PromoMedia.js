import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import CachedImage from './CachedImage';
import MediaSkeleton from './MediaSkeleton';

// A promotion's media lives in `imageUrl`; it may actually be a video. The native
// <Image> only renders a torn, half-decoded frame on iOS and nothing on Android,
// so video URLs must be played with expo-video instead. Shared by the stories
// carousel and the hero banner so both surfaces play video identically to the website.
const VIDEO_URL_RE = /\.(mp4|m4v|mov|webm|m3u8|3gp|mkv)(\?.*)?$/i;
const isVideoUrl = (url) => typeof url === 'string' && VIDEO_URL_RE.test(url);

// Media uploaded through UploadThing is served from an opaque, extensionless URL
// (…/f/<id>), so the regex above classifies every video as an image. The server
// resolves the real type into `mediaType`, but records saved before that existed
// arrive without it — probe the Content-Type once per URL and reuse the answer.
// Кеш переживает перемонтирование карусели, поэтому HEAD-запрос уходит
// максимум один раз за запуск приложения, а не на каждый показ слайда.
const probeCache = new Map(); // uri -> 'video' | 'image'

// Баннер и «сторис» — не кинотеатр: полноэкранный режим не нужен.
// Объектная форма пришла на смену `allowsFullscreen`, который expo-video
// в SDK 54 помечает как устаревший (предупреждение на каждый кадр видео).
const NO_FULLSCREEN = { enable: false };
const probeInFlight = new Map(); // uri -> Promise<'video'|'image'>

// Маленький кадр из ролика — для размытой подложки под видео в баннере.
// Берём его у того же плеера, что уже играет: второй VideoView ради фона —
// это второй декодер, а именно от них Android и падал по памяти.
// 320 px хватает — картинка всё равно размыта; кешируем на весь запуск.
const thumbCache = new Map(); // uri -> VideoThumbnail
const THUMB_AT_SEC = 1;       // не первый кадр: у роликов он часто чёрный
const THUMB_MAX_PX = 320;

function probeKind(uri) {
  if (probeCache.has(uri)) return Promise.resolve(probeCache.get(uri));
  if (probeInFlight.has(uri)) return probeInFlight.get(uri);
  const p = fetch(uri, { method: 'HEAD' })
    .then((r) => ((r.headers.get('content-type') || '').startsWith('video/') ? 'video' : 'image'))
    .catch(() => 'image') // unreachable → assume image, <Image> degrades quietly
    .then((resolved) => {
      probeCache.set(uri, resolved);
      probeInFlight.delete(uri);
      return resolved;
    });
  probeInFlight.set(uri, p);
  return p;
}

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
    probeKind(uri).then((resolved) => { if (!cancelled) setKind(resolved); });
    return () => { cancelled = true; };
  }, [uri, known]);

  return kind; // undefined only while a probe is still in flight
}

// Plays a promo video. `muted` story = full sound; bubble/banner preview = silent loop.
function PromoVideo({ uri, style, muted = false, contentFit = 'cover', paused = false, onFrame }) {
  // `useCaching` кладёт файл в кеш expo-video: первый показ грузится из сети,
  // все следующие — с диска, поэтому белого экрана при повторе больше нет.
  //
  // `bufferOptions` — критичный параметр памяти. По умолчанию на Android
  // ExoPlayer буферизует 20 секунд вперёд, а это десятки МБ распакованных
  // фреймов в RAM. Баннер — короткий зацикленный ролик, ему хватает 4 секунд:
  // на слабых телефонах (3–4 ГБ RAM) это разница между «плавно играет» и
  // «процесс убили по OOM».
  const player = useVideoPlayer({ uri, useCaching: true }, (p) => {
    p.loop = true;
    p.muted = muted;
    p.bufferOptions = {
      preferredForwardBufferDuration: 4, // sec (было 20 по умолчанию)
      minBufferForPlayback: 1,
      maxBufferBytes: 8 * 1024 * 1024,   // 8 МБ верхняя граница сетевого буфера
    };
  });

  // Пока плеер не набрал данных, показываем скелет: раньше на этом месте
  // была пустая белая область — она и выглядела как «зависло».
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!player) return undefined;
    setReady(player.status === 'readyToPlay');
    const sub = player.addListener('statusChange', ({ status }) => {
      setReady(status === 'readyToPlay');
    });
    return () => sub?.remove?.();
  }, [player]);

  useEffect(() => {
    if (!ready || !onFrame) return undefined;
    const cached = thumbCache.get(uri);
    if (cached) { onFrame(cached); return undefined; }
    let cancelled = false;
    player
      .generateThumbnailsAsync(THUMB_AT_SEC, { maxWidth: THUMB_MAX_PX, maxHeight: THUMB_MAX_PX })
      .then(([thumb]) => {
        if (!thumb) return;
        thumbCache.set(uri, thumb);
        if (!cancelled) onFrame(thumb);
      })
      .catch(() => {}); // без подложки края просто цвета карточки
    return () => { cancelled = true; };
  }, [ready, onFrame, player, uri]);

  useEffect(() => {
    if (!player) return;
    // Only the slide actually on screen plays. Several decoders running at once
    // exhausts the phone's hardware video pipeline, which is what makes frames
    // tear/band instead of simply dropping.
    if (paused) player.pause();
    else player.play();
  }, [player, paused]);

  // Пауза при уходе приложения в фон: без этого декодер продолжает работать
  // вхолостую и держит буферы в памяти, пока пользователь листает WhatsApp,
  // а система Android — считать нашу RAM «удерживаемой», что повышает шанс
  // убийства процесса. При возврате возобновляем, если родитель не поставил
  // paused=true самостоятельно.
  useEffect(() => {
    if (!player) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!paused) player.play();
      } else {
        player.pause();
      }
    });
    return () => sub.remove();
  }, [player, paused]);

  // На Android видео по умолчанию рисуется в SurfaceView — это отдельный слой
  // поверх окна, который не участвует в иерархии View: масштаб и сдвиг
  // родителя на него не действуют, скругление карточки его не обрезает.
  // Кадрирование из админки приходит именно трансформацией, поэтому как только
  // она есть — переключаемся на TextureView, обычный View, который честно
  // масштабируется и режется по краю. Решение принимается само по стилю, чтобы
  // следующий экран с кадрированием не наступил на то же самое.
  // Менять тип поверхности на живом плеере нельзя, отсюда key: если
  // кадрирование вдруг появится или пропадёт, VideoView пересоздастся.
  const surfaceType = StyleSheet.flatten(style)?.transform ? 'textureView' : 'surfaceView';

  return (
    // Обёртка нужна, чтобы поверх видео лечь скелету; overflow скругляет
    // видео по радиусу контейнера (кружок «сторис», карточка баннера).
    <View style={[style, styles.clip]}>
      <VideoView
        key={surfaceType}
        surfaceType={surfaceType}
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit={contentFit}
        nativeControls={false}
        fullscreenOptions={NO_FULLSCREEN}
        pointerEvents="none"
      />
      {!ready && <MediaSkeleton style={StyleSheet.absoluteFill} radius={0} />}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});

// Picks a video player or an <Image> based on the media's real type.
export function PromoMedia({
  uri, style, muted, contentFit = 'cover', mediaType, paused = false, posterUrl, onFrame,
}) {
  const kind = useMediaKind(uri, mediaType);

  // Hold a branded skeleton until the type is known — handing an MP4 to <Image> is
  // exactly what renders the corrupted, striped frame this guards against.
  if (!kind) return <MediaSkeleton style={style} radius={0} />;

  if (kind === 'video') {
    return (
      <PromoVideo
        key={uri}
        uri={uri}
        style={style}
        muted={muted}
        contentFit={contentFit}
        paused={paused}
        onFrame={onFrame}
      />
    );
  }
  return (
    <CachedImage
      uri={posterUrl || uri}
      style={style}
      contentFit={contentFit}
      priority="high"
    />
  );
}
