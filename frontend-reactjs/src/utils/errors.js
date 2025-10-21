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

export function normaliseError(error) {
  if (!error) {
    return { message: 'An unknown error occurred.' };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  const message =
    error?.response?.data?.message ??
    error?.data?.message ??
    error?.message ??
    'An unexpected error occurred.';

  const status = error?.response?.status ?? error?.status ?? null;
  const code = error?.code ?? error?.response?.data?.code ?? null;

  return {
    message,
    status,
    code,
    original: error
  };
}

export function toErrorMessage(error) {
  return normaliseError(error).message;
}

export default {
  isAbortError,
  normaliseError,
  toErrorMessage
};
