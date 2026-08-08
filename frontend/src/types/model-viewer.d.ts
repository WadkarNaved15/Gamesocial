import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'model-viewer': any;
      }
    }
  }
}