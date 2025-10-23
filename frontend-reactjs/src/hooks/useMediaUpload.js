import { useCallback, useState } from 'react';

import { performDirectUpload, requestMediaUpload } from '../api/mediaApi.js';

export function useMediaUpload({ token, kind = 'image', visibility } = {}) {
  const [state, setState] = useState({ uploading: false, error: null });

  const upload = useCallback(
    async (file) => {
      if (!file) {
        throw new Error('A file is required to upload media');
      }
      setState({ uploading: true, error: null });
      try {
        const descriptor = await requestMediaUpload({ token, file, kind, visibility });
        await performDirectUpload({ upload: descriptor.upload, file });
        setState({ uploading: false, error: null });
        return {
          storageKey: descriptor.file.storageKey,
          storageBucket: descriptor.file.storageBucket,
          mimeType: descriptor.file.mimeType,
          size: descriptor.file.size,
          publicUrl: descriptor.file.publicUrl,
          visibility: descriptor.file.visibility
        };
      } catch (error) {
        setState({ uploading: false, error });
        throw error;
      }
    },
    [kind, token, visibility]
  );

  return {
    upload,
    uploading: state.uploading,
    error: state.error
  };
}
