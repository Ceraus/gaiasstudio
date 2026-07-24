/**
 * Type declarations for Electron's <webview> custom element in JSX.
 * Electron injects webview support at runtime when webviewTag: true is set
 * in BrowserWindow webPreferences. This declaration makes TypeScript accept
 * the element without errors.
 */

import type { HTMLAttributes } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: HTMLAttributes<HTMLElement> & {
        src?: string;
        allowpopups?: boolean;
        nodeintegration?: boolean;
        nodeintegrationinsubframes?: boolean;
        webpreferences?: string;
        partition?: string;
        preload?: string;
        httpreferrer?: string;
        useragent?: string;
        disablewebsecurity?: boolean;
        allowfullscreen?: boolean;
      };
    }
  }
}

export {};
