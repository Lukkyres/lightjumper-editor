declare module 'gifshot' {
  interface GifshotOptions {
    images: string[];
    gifWidth?: number;
    gifHeight?: number;
    numFrames?: number;
    frameDuration?: number;
    sampleInterval?: number;
    interval?: number;
    progressCallback?: (progress: number) => void;
    completeCallback?: () => void;
    text?: string;
    fontWeight?: string;
    fontSize?: string;
    fontFamily?: string;
    fontColor?: string;
    textAlign?: string;
    textBaseline?: string;
    textXCoordinate?: number;
    textYCoordinate?: number;
    stroke?: {
      color?: string;
      pixels?: number;
    };
    extraFrames?: number;
    crossOrigin?: string;
  }

  interface GifshotResponse {
    error: boolean;
    errorCode?: string;
    errorMsg?: string;
    image?: string;
  }

  export function createGIF(
    options: GifshotOptions, 
    callback: (obj: GifshotResponse) => void
  ): void;
}
