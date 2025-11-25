import React from 'react';
import { render } from '@testing-library/react';
import PlayerPreview from '../../components/inventory/PlayerPreview';

jest.mock('three');

describe('PlayerPreview', () => {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  beforeAll(() => {
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => '',
      };
    };
  });

  afterAll(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('renders a canvas preview container', () => {
    const { container } = render(<PlayerPreview />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
