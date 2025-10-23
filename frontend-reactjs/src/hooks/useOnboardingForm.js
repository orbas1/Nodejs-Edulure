import { useCallback, useMemo, useState } from 'react';

import { createOnboardingState, validateOnboardingState } from '../utils/validation/onboarding.js';

export default function useOnboardingForm(mode = 'learner', overrides = {}) {
  const initialState = useMemo(() => ({ ...createOnboardingState(mode), ...overrides }), [mode, overrides]);
  const [formState, setFormState] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [lastValidation, setLastValidation] = useState(null);

  const updateField = useCallback((name, value) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateAddressField = useCallback((name, value) => {
    setFormState((prev) => ({
      ...prev,
      address: {
        ...(prev.address ?? {}),
        [name]: value
      }
    }));
  }, []);

  const validate = useCallback(() => {
    const result = validateOnboardingState(mode, formState);
    setErrors(result.errors);
    setLastValidation(result);
    return result;
  }, [mode, formState]);

  const reset = useCallback(() => {
    const resetState = createOnboardingState(mode);
    setFormState(resetState);
    setErrors({});
    setLastValidation(null);
  }, [mode]);

  return {
    formState,
    setFormState,
    errors,
    setErrors,
    updateField,
    updateAddressField,
    validate,
    reset,
    lastValidation
  };
}
