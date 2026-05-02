import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const officialLogoPath = path.resolve(currentDir, '../../../frontend/public/logo.png');
let officialLogoBufferCache = null;
let officialLogoDataUriCache = null;

export function getOfficialLogoPath() {
  return officialLogoPath;
}

export function getOfficialLogoBuffer() {
  if (!officialLogoBufferCache) {
    officialLogoBufferCache = fs.readFileSync(officialLogoPath);
  }

  return officialLogoBufferCache;
}

export function getOfficialLogoDataUri() {
  if (!officialLogoDataUriCache) {
    officialLogoDataUriCache = `data:image/png;base64,${getOfficialLogoBuffer().toString('base64')}`;
  }

  return officialLogoDataUriCache;
}
