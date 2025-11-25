import '@testing-library/jest-dom';
import React from 'react';

class ImmediateImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  set src(_value: string) {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

Object.defineProperty(globalThis, 'Image', {
  writable: true,
  value: ImmediateImage,
});

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (
  typeof window !== 'undefined' &&
  typeof window.HTMLElement !== 'undefined'
) {
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}

if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number;
}

if (typeof globalThis.cancelAnimationFrame !== 'function') {
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = ((contextId: string) => {
    if (contextId !== '2d') return null;
    const imageData = {
      data: new Uint8ClampedArray(64),
    };
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => imageData,
      putImageData: () => {},
      drawImage: () => {},
      createImageData: () => imageData,
      transferFromImageBitmap: () => {},
    } as unknown as CanvasRenderingContext2D;
  }) as typeof HTMLCanvasElement.prototype.getContext;
}

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', props),
}));
