declare module '@paddlejs-models/ocr' {
  export function init(): Promise<void>;
  export function recognize(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<any>;
}

declare module '@paddlejs/paddlejs-core' {
  const paddlejsCore: any;
  export = paddlejsCore;
}

declare module '@paddlejs/paddlejs-backend-webgl' {
  const backend: any;
  export default backend;
}
