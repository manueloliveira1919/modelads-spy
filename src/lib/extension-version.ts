// Single source of truth: version comes from extension/manifest.json at build time.
import manifestRaw from "../../extension/manifest.json?raw";

export const EXTENSION_VERSION: string = (JSON.parse(manifestRaw) as { version: string }).version;
export const EXTENSION_ZIP_URL = `/modelads-extension.zip?v=${EXTENSION_VERSION}`;
export const EXTENSION_ZIP_NAME = `modelads-extension-v${EXTENSION_VERSION}.zip`;
