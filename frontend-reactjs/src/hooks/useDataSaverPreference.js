import { useEffect, useState } from 'react';

function getNavigatorConnection() {
  if (typeof navigator === 'undefined') {
    return null;
  }
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

function evaluateDataSaver(connection) {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const reducedDataQuery = window.matchMedia('(prefers-reduced-data: reduce)');
      if (reducedDataQuery.matches) {
        return true;
      }
    } catch (_error) {
      // Ignore unsupported media queries.
    }
  }
  if (connection && typeof connection.saveData === 'boolean') {
    return connection.saveData;
  }
  if (connection && typeof connection.effectiveType === 'string') {
    return ['slow-2g', '2g'].includes(connection.effectiveType);
  }
  return false;
}

export default function useDataSaverPreference() {
  const [prefersDataSaver, setPrefersDataSaver] = useState(() => evaluateDataSaver(getNavigatorConnection()));

  useEffect(() => {
    const connection = getNavigatorConnection();
    let mediaQuery;

    const updatePreference = () => {
      setPrefersDataSaver(evaluateDataSaver(connection));
    };

    updatePreference();

    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', updatePreference);
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        mediaQuery = window.matchMedia('(prefers-reduced-data: reduce)');
        const listener = () => updatePreference();
        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', listener);
        } else if (typeof mediaQuery.addListener === 'function') {
          mediaQuery.addListener(listener);
        }
        return () => {
          if (connection && typeof connection.removeEventListener === 'function') {
            connection.removeEventListener('change', updatePreference);
          }
          if (mediaQuery) {
            if (typeof mediaQuery.removeEventListener === 'function') {
              mediaQuery.removeEventListener('change', listener);
            } else if (typeof mediaQuery.removeListener === 'function') {
              mediaQuery.removeListener(listener);
            }
          }
        };
      } catch (_error) {
        // No-op when the prefers-reduced-data query is unsupported.
      }
    }

    return () => {
      if (connection && typeof connection.removeEventListener === 'function') {
        connection.removeEventListener('change', updatePreference);
      }
    };
  }, []);

  return prefersDataSaver;
}
