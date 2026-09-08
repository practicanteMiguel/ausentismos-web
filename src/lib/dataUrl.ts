import "server-only";

/** Decodifica una data URL ("data:mime/type;base64,...") a sus bytes crudos. */
export function decodeDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? dataUrl;
  return new Uint8Array(Buffer.from(base64, "base64"));
}
