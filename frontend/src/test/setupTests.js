import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (!global.ResizeObserver) {
  global.ResizeObserver = ResizeObserverMock;
}

if (!global.IntersectionObserver) {
  global.IntersectionObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}
