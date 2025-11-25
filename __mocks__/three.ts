const noop = () => {};

class Scene {
  add = jest.fn();
}

class PerspectiveCamera {
  position = { z: 0 };
  aspect = 1;
  constructor() {
    this.position = { z: 0 };
  }
  updateProjectionMatrix = jest.fn();
}

class WebGLRenderer {
  constructor(_: any) {}
  setPixelRatio = jest.fn();
  setSize = jest.fn();
  render = jest.fn();
  dispose = jest.fn();
}

class Group {
  add = jest.fn();
  rotation = { x: 0, y: 0 };
  position = { set: jest.fn() };
}

class BoxGeometry {
  attributes = {
    uv: {
      setXY: jest.fn(),
      needsUpdate: false,
    },
  };
  dispose = jest.fn();
}

class PlaneGeometry {
  dispose = jest.fn();
}

class MeshBasicMaterial {
  map: any = null;
  needsUpdate = false;
  constructor(_: any = {}) {}
  dispose = jest.fn();
}

class Mesh {
  position = { set: jest.fn(), x: 0, y: 0 };
  rotation = { x: 0, y: 0 };
  constructor(_: any, __: any) {}
}

class AmbientLight {
  constructor(_: any, __?: any) {}
}

class DirectionalLight {
  position = { set: jest.fn() };
  constructor(_: any, __?: any) {}
}

class CanvasTexture {
  magFilter: any;
  minFilter: any;
  wrapS: any;
  wrapT: any;
  flipY = false;
  constructor(_: HTMLCanvasElement) {}
}

class TextureLoader {
  load = (_src: string, cb?: (texture: Texture) => void) => {
    const texture = new Texture();
    if (cb) cb(texture);
    return texture;
  };
}

class Texture {
  magFilter: any;
  minFilter: any;
  flipY = false;
  wrapS: any;
  wrapT: any;
}

const MathUtils = {
  clamp: (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max),
};

export const NearestFilter = 'NearestFilter';
export const ClampToEdgeWrapping = 'ClampToEdgeWrapping';

export {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  BoxGeometry,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  CanvasTexture,
  TextureLoader,
  Texture,
  MathUtils,
};

export default {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  BoxGeometry,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  CanvasTexture,
  TextureLoader,
  Texture,
  MathUtils,
  NearestFilter,
  ClampToEdgeWrapping,
};
