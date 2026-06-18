import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { PrimaryButton } from '../components/SharedWidgets';
import MapboxMap from '../components/MapboxMap';
import { RESTAURANT_LAT, RESTAURANT_LNG, MAPBOX_TOKEN } from '../core/constants';

const DEFAULT_LOCATION = {
  latitude: RESTAURANT_LAT,
  longitude: RESTAURANT_LNG,
};

export default function MapPickerScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = route?.params || {};

  const initialLat = params.initialLat ?? DEFAULT_LOCATION.latitude;
  const initialLng = params.initialLng ?? DEFAULT_LOCATION.longitude;

  const [selectedLocation, setSelectedLocation] = useState(
    params.initialLat != null && params.initialLng != null
      ? { latitude: params.initialLat, longitude: params.initialLng }
      : null
  );
  const [userLocation, setUserLocation] = useState(null);
  const [address, setAddress] = useState('');
  const geoSeq = useRef(0);

  // Обратное геокодирование: координаты -> адрес
  const reverseGeocode = useCallback(async (lat, lng) => {
    const seq = ++geoSeq.current;
    setAddress('…');
    try {
      const lang = (i18n.language || 'en').slice(0, 2);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
        `?access_token=${MAPBOX_TOKEN}&language=${lang}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (seq !== geoSeq.current) return;
      setAddress(data?.features?.[0]?.place_name || '');
    } catch {
      if (seq === geoSeq.current) setAddress('');
    }
  }, []);

  const handleMapPress = (lat, lng) => {
    setSelectedLocation({ latitude: lat, longitude: lng });
    reverseGeocode(lat, lng);
  };

  const handleLocate = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserLocation(here);
      setSelectedLocation(here);
      reverseGeocode(here.latitude, here.longitude);
    } catch (_) {}
  };

  const handleConfirm = () => {
    if (!selectedLocation) return;
    if (typeof params.onSelect === 'function') {
      params.onSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        ...(address && address !== '…' ? { address } : {}),
      });
    }
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={[Typography.heading2, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {t('select_delivery_location')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapWrapper}>
        <MapboxMap
          lat={selectedLocation?.latitude ?? userLocation?.latitude ?? initialLat}
          lng={selectedLocation?.longitude ?? userLocation?.longitude ?? initialLng}
          userLocation={userLocation}
          markers={[
            { lat: RESTAURANT_LAT, lng: RESTAURANT_LNG, type: 'restaurant', color: Colors.primary, title: t('app_title') },
            ...(selectedLocation
              ? [{ lat: selectedLocation.latitude, lng: selectedLocation.longitude, type: 'delivery', color: Colors.primaryDark, title: t('delivery_location') }]
              : []),
          ]}
          interactive
          onPress={handleMapPress}
          onLocateRequest={handleLocate}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.locationSummary}>
          <Text style={Typography.bodySmall}>{t('tap_map_hint')}</Text>
          {selectedLocation ? (
            <>
              <Text style={[Typography.body, { fontWeight: '600' }]} numberOfLines={2}>
                {address && address !== '…' ? `📍 ${address}` : t('locating')}
              </Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]} numberOfLines={1}>
                {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
              </Text>
            </>
          ) : (
            <Text style={Typography.body} numberOfLines={1}>{t('pick_on_map')}</Text>
          )}
        </View>
        <PrimaryButton
          label={t('confirm_location')}
          onPress={handleConfirm}
          disabled={!selectedLocation}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  mapWrapper: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    ...Shadows.md,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Math.max(Spacing.lg, 16),
    paddingTop: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  locationSummary: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
});
