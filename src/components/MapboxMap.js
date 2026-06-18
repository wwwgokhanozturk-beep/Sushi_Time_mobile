import React, { useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAPBOX_TOKEN } from '../core/constants';

/**
 * MapboxMap — карта на Mapbox GL JS через WebView (drop-in замена LeafletMap).
 * Дизайн в стиле сайта: фирменный красный пин ресторана, красный пульсирующий кружок юзера.
 *
 * Props:
 *   lat, lng           — центр карты
 *   zoom               — уровень зума (default 14.5)
 *   markers            — [{ lat, lng, color, title, type }]  (type: 'restaurant' | 'delivery')
 *   userLocation       — { lat, lng } текущая позиция юзера (красный кружок) | null
 *   interactive        — разрешить тап/перемещение (default true)
 *   onPress(lat, lng)  — колбэк при тапе по карте (только если interactive)
 *   onLocateRequest()  — колбэк при нажатии кнопки «моё местоположение» (показывает кнопку)
 *   style              — стиль контейнера
 */
export default function MapboxMap({
  lat,
  lng,
  zoom = 14.5,
  markers = [],
  userLocation = null,
  interactive = true,
  onPress,
  onLocateRequest,
  style,
}) {
  const webRef = useRef(null);

  const markersJson = JSON.stringify(markers);
  const userJson = JSON.stringify(userLocation);
  // Кнопку показываем, пока местоположение не получено; после — убираем.
  const showLocate = !!onLocateRequest && !userLocation;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #F5F5F7; font-family: -apple-system, Roboto, sans-serif; }
    .pin { width: 26px; height: 26px; border-radius: 50% 50% 50% 0; transform: rotate(45deg);
      border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,.35); }
    .pin-label { background:#E8181B;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;
      white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);margin-bottom:3px; }
    .pin-wrap { display:flex;flex-direction:column;align-items:center; }
    .user-dot { position:relative;width:18px;height:18px; }
    .user-dot .ring { position:absolute;inset:0;border-radius:50%;background:#E8181B;opacity:.35;animation:pulse 1.8s ease-out infinite; }
    .user-dot .core { position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:#E8181B;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4); }
    @keyframes pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(3.2);opacity:0} }
    #locate { position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:10px;
      background:#E8181B;color:#fff;border:none;border-radius:999px;padding:14px 26px;font-size:16px;font-weight:800;
      box-shadow:0 6px 18px rgba(232,24,27,.45);font-family:inherit;white-space:nowrap; }
    #locate .ic { font-size:20px; }
  </style>
</head>
<body>
  <div id="map"></div>
  ${showLocate ? '<button id="locate"><span class="ic">📍</span><span>Konum</span></button>' : ''}
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js"></script>
  <script>
    mapboxgl.accessToken = '${MAPBOX_TOKEN}';
    var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [${lng}, ${lat}],
      zoom: ${zoom},
      attributionControl: false,
      interactive: ${interactive},
    });
    ${interactive ? "map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');" : ''}

    function makePin(m) {
      var color = m.color || '#E8181B';
      var wrap = document.createElement('div');
      wrap.className = 'pin-wrap';
      var label = m.title ? '<div class="pin-label" style="background:' + color + '">' +
        (m.type === 'restaurant' ? '🍣 ' : '') + m.title + '</div>' : '';
      wrap.innerHTML = label + '<div class="pin" style="background:' + color + '"></div>';
      return wrap;
    }

    map.on('load', function () {
      var markers = ${markersJson};
      markers.forEach(function (m) {
        new mapboxgl.Marker({ element: makePin(m), anchor: 'bottom' })
          .setLngLat([m.lng, m.lat]).addTo(map);
      });

      var user = ${userJson};
      if (user) {
        var el = document.createElement('div');
        el.className = 'user-dot';
        el.innerHTML = '<div class="ring"></div><div class="core"></div>';
        new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([user.lng, user.lat]).addTo(map);
      }
    });

    ${interactive ? `
    map.on('click', function (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress', lat: e.lngLat.lat, lng: e.lngLat.lng }));
    });` : ''}

    ${showLocate ? `
    document.getElementById('locate').addEventListener('click', function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'locate' }));
    });` : ''}
  </script>
</body>
</html>
`;

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'mapPress' && onPress) onPress(data.lat, data.lng);
        else if (data.type === 'locate' && onLocateRequest) onLocateRequest();
      } catch (_) {}
    },
    [onPress, onLocateRequest]
  );

  return (
    <WebView
      ref={webRef}
      style={[styles.map, style]}
      source={{ html }}
      originWhitelist={['*']}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#F5F5F7' },
});
