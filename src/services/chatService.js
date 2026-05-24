import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';

export const chatService = {
  getMyChat: () => httpClient.get(ApiConstants.chatMy),
  sendMessage: (text) => httpClient.post(ApiConstants.chatMyMessages, { text }),
};
