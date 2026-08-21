import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { ApiConstants } from '../core/api';
import { useProfileStore } from '../store/profileStore';
import { getDeviceId, getTrackingToken, saveTrackingToken } from './tracking';

/**
 * Живое отслеживание одного заказа.
 *
 * Возвращает { driverLocation, status }:
 *   driverLocation — { lat, lng, updatedAt } | null — позиция курьера
 *   status         — статус заказа, пришедший по сокету (быстрее опроса раз в 15с)
 *
 * Позиция приходит только пока заказ в пути и только тому, кто доказал право
 * на заказ: владельцу по JWT либо гостю с trackingToken.
 */
export function useOrderTracking(orderId, order) {
  const token = useProfileStore((s) => s.token);
  const [driverLocation, setDriverLocation] = useState(null);
  const [status, setStatus] = useState(null);

  // Токен мог прийти вместе с заказом — сохраняем на будущее.
  useEffect(() => {
    if (order?._id && order?.trackingToken) {
      saveTrackingToken(order._id, order.trackingToken);
    }
  }, [order?._id, order?.trackingToken]);

  useEffect(() => {
    if (!orderId) return undefined;

    let cancelled = false;
    let socket = null;
    let subscribe = null;

    const onDriverLocation = (payload) => {
      if (String(payload.orderId) !== String(orderId)) return;
      setDriverLocation({ lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt });
    };
    const onStatus = (payload) => {
      if (String(payload.orderId) !== String(orderId)) return;
      setStatus(payload.status);
      if (['delivered', 'cancelled'].includes(payload.status)) setDriverLocation(null);
    };

    (async () => {
      const trackingToken = await getTrackingToken(orderId);
      // Сервер принимает либо JWT, либо guestId — гостю хватает второго.
      const auth = token ? { token } : { guestId: await getDeviceId() };
      if (cancelled) return;

      console.log('[SushiTime] Tracking socket connecting:', ApiConstants.socketUrl);
      socket = io(ApiConstants.socketUrl, {
        transports: ['polling', 'websocket'],
        auth,
      });

      subscribe = () => {
        socket.emit('order:subscribe', { orderId, trackingToken }, (res) => {
          if (cancelled) return;
          if (res?.success) {
            if (res.data?.driverLocation) setDriverLocation(res.data.driverLocation);
            if (res.data?.status) setStatus(res.data.status);
          } else {
            console.log('[SushiTime] Tracking subscribe failed:', res?.message);
          }
        });
      };

      socket.on('connect', subscribe);
      socket.on('order:driver_location', onDriverLocation);
      socket.on('order:status', onStatus);
    })();

    return () => {
      cancelled = true;
      if (socket) {
        socket.off('order:driver_location', onDriverLocation);
        socket.off('order:status', onStatus);
        if (subscribe) socket.off('connect', subscribe);
        socket.disconnect();
      }
    };
  }, [orderId, token]);

  return { driverLocation, status };
}
