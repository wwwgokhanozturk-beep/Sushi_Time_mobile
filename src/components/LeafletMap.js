import React, { useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * LeafletMap — бесплатная карта на базе OpenStreetMap через WebView.
 *
 * Props:
 *   lat, lng          — центр карты
 *   zoom              — уровень зума (default 15)
 *   markers           — [{ lat, lng, color, title }]
 *   interactive       — разрешить тап/перемещение (default true)
 *   onPress(lat, lng) — колбэк при тапе по карте (только если interactive=true)
 *   style             — стиль контейнера
 */
export default function LeafletMap({
  lat,
  lng,
  zoom = 15,
  markers = [],
  interactive = true,
  onPress,
  style,
}) {
  const webRef = useRef(null);

  const markersJson = JSON.stringify(markers);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #1a1a1a; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: ${interactive},
      dragging: ${interactive},
      touchZoom: ${interactive},
      scrollWheelZoom: false,
      doubleClickZoom: ${interactive},
    }).setView([${lat}, ${lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    var markers = ${markersJson};
    markers.forEach(function(m) {
      var icon = L.divIcon({
        html: '<div style="width:22px;height:22px;border-radius:50%;background:' + (m.color || '#E8272A') + ';border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        className: '',
      });
      L.marker([m.lat, m.lng], { icon: icon })
        .addTo(map)
        .bindPopup(m.title || '');
    });

    ${interactive ? `
    map.on('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapPress',
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      }));
    });
    ` : ''}
  </script>
</body>
</html>
`;

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'mapPress' && onPress) {
          onPress(data.lat, data.lng);
        }
      } catch (_) {}
    },
    [onPress]
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
  map: { flex: 1, backgroundColor: '#1a1a1a' },
});
