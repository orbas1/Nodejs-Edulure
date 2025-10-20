export function isAbortError(error) {
  if (!error) {
    return false;
  }

  if (error.name === 'AbortError' || error.name === 'CanceledError') {
    return true;
  }

  if (error.code === 'ERR_CANCELED') {
    return true;
  }

  if (error.message === 'canceled') {
    return true;
  }

  return false;
}

export default {
  isAbortError
};
