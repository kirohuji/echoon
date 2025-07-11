import { CONFIG } from 'src/config-global';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export default class PipecatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CONFIG.site.pipecatUrl;
  }

  action(pipecatClient: any, target: any) {
    const controller = new AbortController();
    const { signal } = controller;

    const requestOptions = {
      method: 'POST',
      body: JSON.stringify(target),
      headers: {
        'Content-Type': 'application/json',
      },
    };
    fetchEventSource(`${this.baseUrl}/bot/action`, {
      openWhenHidden: true,
      ...requestOptions,
      signal,
      async onmessage(msg) {
        try {
          const decodedData = JSON.parse(atob(msg.data));
          pipecatClient.handleMessage(decodedData);
        } catch (error) {
          console.error('解析消息时出错:', error);
          console.log('原始消息:', msg);
        }
      },
      onclose() {
      },
      onerror(err) {
        console.error('EventSource failed:', err);
        controller.abort(); // Abort the request to prevent retries
      },
    });
  }
}