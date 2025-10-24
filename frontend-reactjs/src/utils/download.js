export function downloadTextFile({ content, fileName, mimeType = 'text/plain' }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const blob = new Blob([content], { type: mimeType });
  const urlCreator = window.URL || window.webkitURL;
  const createUrl = urlCreator?.createObjectURL;
  if (typeof createUrl !== 'function') {
    return false;
  }

  const url = createUrl.call(urlCreator, blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'download.txt';
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (typeof urlCreator.revokeObjectURL === 'function') {
    urlCreator.revokeObjectURL(url);
  }

  return true;
}

const downloadUtils = {
  downloadTextFile
};

export default downloadUtils;

