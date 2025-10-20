export async function computeFileChecksum(file) {
  if (!file) {
    throw new Error('No file selected for checksum calculation');
  }
  if (!('crypto' in window) || !window.crypto?.subtle) {
    throw new Error('Secure hashing is not available in this browser');
  }
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  computeFileChecksum
};
