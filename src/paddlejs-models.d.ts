declare module '@paddlejs-models/ocr' {
  export function init(): Promise<void>;
  export function recognize(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<any>;
}
