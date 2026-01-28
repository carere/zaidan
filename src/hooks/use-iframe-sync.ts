import { createEffect, onCleanup } from "solid-js";

/**
 * Sends a typed message to an iframe's contentWindow using postMessage.
 * @param iframe - The HTMLIFrameElement to send the message to
 * @param type - The message type identifier
 * @param data - The data payload to send
 */
export function sendToIframe<T>(iframe: HTMLIFrameElement, type: string, data: T) {
  if (iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type, ...data }, "*");
  }
}

/**
 * A SolidJS hook that listens for messages from parent window or iframe.
 * Automatically cleans up the event listener on component unmount.
 * @param type - The message type to listen for
 * @param callback - The callback to invoke when a matching message is received
 */
export function useIframeMessageListener<T>(type: string, callback: (data: T) => void) {
  createEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === type) {
        callback(event.data as T);
      }
    };

    window.addEventListener("message", handleMessage);
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });
}
