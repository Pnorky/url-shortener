interface QrCodeGlobalApi {
  toDataURL(
    text: string,
    opts?: {
      width?: number;
      margin?: number;
      color?: { dark?: string; light?: string };
      errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    },
  ): Promise<string>;
}

function __getQrCodeGlobal(): QrCodeGlobalApi | null {
  const w = window as unknown as { QRCode?: QrCodeGlobalApi };
  const api = w.QRCode;
  if (!api || typeof api.toDataURL !== "function") {
    return null;
  }
  return api;
}

function generateQrDataUrl(text: string, width = 280): Promise<string> {
  const QRCode = __getQrCodeGlobal();
  if (!QRCode) {
    return Promise.reject(new Error("qrcode_lib_missing"));
  }
  return QRCode.toDataURL(text, {
    width,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
