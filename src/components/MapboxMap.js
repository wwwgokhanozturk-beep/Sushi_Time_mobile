import React, { useRef, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAPBOX_TOKEN, RESTAURANT_LOGO_URL } from '../core/constants';

/**
 * MapboxMap — карта на Mapbox GL JS через WebView (drop-in замена LeafletMap).
 * Дизайн в стиле сайта: фирменный красный пин ресторана, красный пульсирующий кружок юзера.
 *
 * Props:
 *   lat, lng           — центр карты
 *   zoom               — уровень зума (default 14.5)
 *   markers            — [{ lat, lng, color, title, type }]  (type: 'restaurant' | 'delivery')
 *   userLocation       — { lat, lng } текущая позиция юзера (красный кружок) | null
 *   driverLocation     — { lat, lng } живая позиция курьера | null (обновляется
 *                        инъекцией в WebView, без перезагрузки карты)
 *   interactive        — разрешить тап/перемещение (default true)
 *   onPress(lat, lng)  — колбэк при тапе по карте (только если interactive)
 *   onLocateRequest()  — колбэк при нажатии кнопки «моё местоположение» (показывает кнопку)
 *   locateLabel        — подпись этой кнопки; экран передаёт её переведённой,
 *                        внутри WebView до i18n не дотянуться
 *   style              — стиль контейнера
 */
export default function MapboxMap({
  lat,
  lng,
  zoom = 14.5,
  markers = [],
  userLocation = null,
  driverLocation = null,
  interactive = true,
  onPress,
  onLocateRequest,
  locateLabel = 'Konum',
  logoUrl = RESTAURANT_LOGO_URL,
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
    .logo-pin { width:72px;height:72px;border-radius:50%;background:#fff;border:3px solid #E8181B;
      box-shadow:0 4px 14px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center; }
    .logo-pin img { width:54px;height:auto;display:block; }
    .user-dot { position:relative;width:18px;height:18px; }
    .user-dot .ring { position:absolute;inset:0;border-radius:50%;background:#E8181B;opacity:.35;animation:pulse 1.8s ease-out infinite; }
    .user-dot .core { position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:#E8181B;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4); }
    .driver-dot { position:relative;width:44px;height:44px; }
    .driver-dot .ring { position:absolute;inset:0;border-radius:50%;background:#E8181B;opacity:.3;animation:pulse 1.8s ease-out infinite; }
    .driver-dot .core { position:absolute;top:5px;left:5px;width:34px;height:34px;border-radius:50%;background:#fff;
      border:3px solid #E8181B;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:18px; }
    @keyframes pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(3.2);opacity:0} }
    #locate { position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:10px;
      background:#E8181B;color:#fff;border:none;border-radius:999px;padding:14px 26px;font-size:16px;font-weight:800;
      box-shadow:0 6px 18px rgba(232,24,27,.45);font-family:inherit;white-space:nowrap; }
    #locate .ic { font-size:20px; }
  </style>
</head>
<body>
  <div id="map"></div>
  ${showLocate ? `<button id="locate"><span class="ic">📍</span><span>${locateLabel}</span></button>` : ''}
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

      // Ресторан — фирменный логотип на белом круге, как в веб-версии.
      if (m.type === 'restaurant') {
        wrap.className = 'logo-pin';
        wrap.innerHTML = '<img src="${logoUrl}" alt="' + (m.title || '') + '" />';
        return wrap;
      }

      wrap.className = 'pin-wrap';
      var label = m.title ? '<div class="pin-label" style="background:' + color + '">' +
        m.title + '</div>' : '';
      wrap.innerHTML = label + '<div class="pin" style="background:' + color + '"></div>';
      return wrap;
    }

    map.on('load', function () {
      var markers = ${markersJson};
      markers.forEach(function (m) {
        // Круглый значок ресторана центрируем на точке, каплю ставим остриём.
        new mapboxgl.Marker({ element: makePin(m), anchor: m.type === 'restaurant' ? 'center' : 'bottom' })
          .setLngLat([m.lng, m.lat]).addTo(map);
      });

      var user = ${userJson};
      if (user) {
        var el = document.createElement('div');
        el.className = 'user-dot';
        el.innerHTML = '<div class="ring"></div><div class="core"></div>';
        new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([user.lng, user.lat]).addTo(map);
      }

      mapReady = true;
      if (pendingDriver) setDriver(pendingDriver.lat, pendingDriver.lng);
    });

    // ── Курьер ─────────────────────────────────────────────────────────
    // Позиция обновляется инъекцией из React Native, а не пересборкой HTML:
    // перезагружать WebView каждые несколько секунд нельзя.
    var driverMarker = null;
    var mapReady = false;
    var pendingDriver = null;
    var userMoved = false;
    map.on('dragstart', function () { userMoved = true; });

    function setDriver(lat, lng) {
      if (!mapReady) { pendingDriver = { lat: lat, lng: lng }; return; }
      if (!driverMarker) {
        var el = document.createElement('div');
        el.className = 'driver-dot';
        el.innerHTML = '<div class="ring"></div><div class="core">🛵</div>';
        driverMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat]).addTo(map);
      } else {
        driverMarker.setLngLat([lng, lat]);
      }
      if (userMoved) return;
      // Держим в кадре курьера и точку доставки (последний маркер в списке).
      var markers = ${markersJson};
      var target = markers.filter(function (m) { return m.type === 'delivery'; })[0];
      if (target) {
        var b = new mapboxgl.LngLatBounds([lng, lat], [lng, lat]);
        b.extend([target.lng, target.lat]);
        map.fitBounds(b, { padding: 50, maxZoom: 15.5, duration: 800 });
      } else {
        map.easeTo({ center: [lng, lat], zoom: 15, duration: 800 });
      }
    }

    function clearDriver() {
      pendingDriver = null;
      if (driverMarker) { driverMarker.remove(); driverMarker = null; }
    }

    window.setDriver = setDriver;
    window.clearDriver = clearDriver;

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

  // Позиция курьера приходит каждые несколько секунд — двигаем маркер внутри
  // уже загруженной карты, иначе WebView перезагружался бы на каждый тик.
  useEffect(() => {
    const js = driverLocation
      ? `window.setDriver && window.setDriver(${driverLocation.lat}, ${driverLocation.lng}); true;`
      : 'window.clearDriver && window.clearDriver(); true;';
    webRef.current?.injectJavaScript(js);
  }, [driverLocation?.lat, driverLocation?.lng]);

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
