/// <reference types="vite/client" />

// Declare module for PNG imports
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
