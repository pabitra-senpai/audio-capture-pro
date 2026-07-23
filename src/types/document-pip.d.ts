export {};

declare global {
  interface DocumentPictureInPictureOptions {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
    preferInitialWindowPlacement?: boolean;
  }

  interface DocumentPictureInPicture extends EventTarget {
    readonly window: Window | null;
    requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}
