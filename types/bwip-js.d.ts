declare module "bwip-js" {
  type BarcodeOptions = { bcid: string; text: string; scale?: number; height?: number; includetext?: boolean; backgroundcolor?: string; barcolor?: string };
  const api: { toBuffer(options: BarcodeOptions): Promise<Buffer> };
  export default api;
}
