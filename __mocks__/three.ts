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
  constructor(...args: unknown[]) {
    void args;
  }
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

class Texture {
  magFilter: unknown;
  minFilter: unknown;
  flipY = false;
  wrapS: unknown;
  wrapT: unknown;
}

class MeshBasicMaterial {
  map: Texture | null = null;
  needsUpdate = false;
  constructor(params: unknown = {}) {
    void params;
  }
  dispose = jest.fn();
}

class Mesh {
  position = { set: jest.fn(), x: 0, y: 0 };
  rotation = { x: 0, y: 0 };
  constructor(...args: unknown[]) {
    void args;
  }
}

class AmbientLight {
  constructor(...args: unknown[]) {
    void args;
  }
}

class DirectionalLight {
  position = { set: jest.fn() };
  constructor(...args: unknown[]) {
    void args;
  }
}

class CanvasTexture {
  magFilter: unknown;
  minFilter: unknown;
  wrapS: unknown;
  wrapT: unknown;
  flipY = false;
  constructor(canvas: HTMLCanvasElement) {
    void canvas;
  }
}

class TextureLoader {
  load = (_src: string, cb?: (texture: Texture) => void) => {
    const texture = new Texture();
    if (cb) cb(texture);
    return texture;
  };
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

const threeMock = {
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

export default threeMock;
