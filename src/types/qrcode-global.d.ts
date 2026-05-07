/** Browser bundle (resource/vendor/qrcode.min.js) exposes `QRCode` on window. */
interface QrCodeBrowserBundle {
  create(text: string, opts?: unknown): unknown;
  toDataURL(text: string, opts?: unknown): Promise<string>;
  toCanvas?: unknown;
  toString?: unknown;
}

interface Window {
  QRCode?: QrCodeBrowserBundle;
}
