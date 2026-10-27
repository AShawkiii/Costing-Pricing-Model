/// <reference types="vite/client" />

/** Injected by vite.config.ts from package.json — shown in the app header. */
declare const __APP_VERSION__: string;

/** False in the standalone single-file build, which has no backend. */
declare const __API_ENABLED__: boolean;
