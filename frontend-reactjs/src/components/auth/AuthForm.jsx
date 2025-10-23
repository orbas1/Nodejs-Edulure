import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FormField from '../FormField.jsx';

function getValueByPath(source, path) {
  if (!path) {
    return undefined;
  }
  const segments = path.split('.');
  let current = source;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setValueByPath(source, path, nextValue) {
  if (!path) {
    return source;
  }
  const segments = path.split('.');
  const clone = Array.isArray(source) ? [...source] : { ...source };
  let current = clone;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLeaf = index === segments.length - 1;
    if (isLeaf) {
      current[segment] = nextValue;
      break;
    }
    const existing = current[segment];
    if (Array.isArray(existing)) {
      current[segment] = [...existing];
    } else if (existing && typeof existing === 'object') {
      current[segment] = { ...existing };
    } else {
      current[segment] = {};
    }
    current = current[segment];
  }
  return clone;
}

function isTruthy(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value) && value !== 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return String(value).trim().length > 0;
}

function normaliseSubmitError(error) {
  if (!error) return null;
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'We could not submit the form. Please try again.';
}

function buildFieldRenderer({
  fields,
  values,
  errors,
  createChangeHandler
}) {
  const fieldMap = new Map(fields.map((field) => [field.name, field]));

  function renderInput(field, value, error) {
    if (field.render) {
      return field.render({
        field,
        value,
        error,
        onChange: createChangeHandler(field)
      });
    }

    if (field.component === 'select') {
      return (
        <FormField
          key={field.name}
          label={field.label}
          name={field.name}
          required={field.required}
          helper={field.helper}
          error={error}
        >
          <select
            name={field.name}
            value={value ?? ''}
            onChange={createChangeHandler(field)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoComplete={field.autoComplete}
          >
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      );
    }

    if (field.type === 'textarea') {
      return (
        <FormField
          key={field.name}
          label={field.label}
          name={field.name}
          required={field.required}
          helper={field.helper}
          error={error}
        >
          <textarea
            name={field.name}
            value={value ?? ''}
            onChange={createChangeHandler(field)}
            rows={field.rows ?? 3}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoComplete={field.autoComplete}
            placeholder={field.placeholder}
          />
        </FormField>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label
          key={field.name}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
        >
          <input
            type="checkbox"
            name={field.name}
            checked={Boolean(value)}
            onChange={createChangeHandler(field)}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span className="font-semibold">{field.label}</span>
        </label>
      );
    }

    return (
      <FormField
        key={field.name}
        label={field.label}
        type={field.type}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        value={value ?? ''}
        onChange={createChangeHandler(field)}
        helper={field.helper}
        error={error}
        autoComplete={field.autoComplete}
        inputMode={field.inputMode}
        pattern={field.pattern}
        min={field.min}
        max={field.max}
        step={field.step}
      />
    );
  }

  function Field({ name, override = {} }) {
    const field = fieldMap.get(name);
    if (!field || field.hidden) {
      return null;
    }
    const mergedField = { ...field, ...override };
    const value = getValueByPath(values, mergedField.name);
    const error = errors[mergedField.name];
    const rendered = renderInput(mergedField, value, error);
    if (!rendered) {
      return null;
    }
    return <div className={mergedField.wrapperClassName}>{rendered}</div>;
  }

  Field.propTypes = {
    name: PropTypes.string.isRequired,
    override: PropTypes.object
  };

  return { Field, renderInput };
}

export default function AuthForm({
  fields = [],
  initialValues = {},
  validator,
  onSubmit,
  submitLabel = 'Continue',
  busyLabel = 'Processing…',
  isSubmitting: controlledSubmitting,
  status,
  statusTone = 'info',
  beforeFields,
  afterFields,
  renderFields,
  footer,
  onValuesChange,
  showProgress = false,
  progressLabel,
  externalError,
  analyticsTag
}) {
  const [values, setValues] = useState(() => ({ ...initialValues }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues((prev) => ({ ...prev, ...initialValues }));
  }, [initialValues]);

  const actualSubmitting = controlledSubmitting ?? submitting;

  const createChangeHandler = useCallback(
    (field) => (eventOrValue) => {
      const nextValue = (() => {
        if (eventOrValue && eventOrValue.target) {
          if (field.type === 'checkbox') {
            return Boolean(eventOrValue.target.checked);
          }
          if (field.type === 'number') {
            const numeric = Number(eventOrValue.target.value);
            return Number.isFinite(numeric) ? eventOrValue.target.value : '';
          }
          return eventOrValue.target.value;
        }
        return eventOrValue;
      })();

      setErrors((prev) => {
        const next = { ...prev };
        delete next[field.name];
        return next;
      });
      setFormError(null);
      setValues((prev) => {
        const updated = setValueByPath(prev, field.name, nextValue);
        onValuesChange?.(updated, { field: field.name, value: nextValue });
        return updated;
      });
    },
    [onValuesChange]
  );

  const { Field, renderInput } = useMemo(
    () => buildFieldRenderer({ fields, values, errors, createChangeHandler }),
    [fields, values, errors, createChangeHandler]
  );

  const visibleFields = useMemo(
    () => fields.filter((field) => !field.hidden && field.type !== 'checkbox'),
    [fields]
  );

  const completionPercent = useMemo(() => {
    if (!showProgress || visibleFields.length === 0) {
      return 0;
    }
    const filled = visibleFields.reduce((count, field) => {
      const value = getValueByPath(values, field.name);
      return count + (isTruthy(value) ? 1 : 0);
    }, 0);
    return Math.round((filled / visibleFields.length) * 100);
  }, [showProgress, visibleFields, values]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const validation = validator ? validator(values) : { errors: {} };
    const validationErrors = validation?.errors ?? {};
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFormError(validation?.formError ?? 'Please review the highlighted fields.');
      return;
    }

    try {
      setSubmitting(true);
      const submissionResult = await onSubmit(values);
      setSubmitting(false);
      if (submissionResult && typeof submissionResult === 'object') {
        if (submissionResult.errors && typeof submissionResult.errors === 'object') {
          setErrors((prev) => ({ ...prev, ...submissionResult.errors }));
        }
        if (submissionResult.formError) {
          setFormError(submissionResult.formError);
        }
        if (submissionResult.status === 'handled') {
          return;
        }
      }
    } catch (error) {
      setSubmitting(false);
      const message = normaliseSubmitError(error);
      if (error?.details && typeof error.details === 'object') {
        setErrors((prev) => ({ ...prev, ...error.details }));
      }
      setFormError(message);
    }
  }

  const statusColours = {
    info: 'bg-primary/5 text-primary border-primary/20',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const effectiveStatusTone = statusTone in statusColours ? statusTone : 'info';
  const progressTone = completionPercent >= 100 ? 'bg-emerald-500' : 'bg-primary';

  const defaultContent = (
    <div className="space-y-5">
      {fields.map((field) => {
        if (field.hidden) {
          return null;
        }
        const value = getValueByPath(values, field.name);
        const error = errors[field.name];
        const rendered = renderInput(field, value, error);
        if (!rendered) {
          return null;
        }
        return (
          <div key={field.name} className={field.wrapperClassName}>
            {rendered}
          </div>
        );
      })}
    </div>
  );

  const fieldsContent = renderFields
    ? renderFields({
        Field,
        values,
        errors,
        onChange: (name, value) => {
          const field = fields.find((item) => item.name === name);
          if (!field) return;
          createChangeHandler(field)(value);
        }
      })
    : defaultContent;

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate data-analytics={analyticsTag}>
      {showProgress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{progressLabel ?? 'Progress'}</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${progressTone}`}
              style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
            />
          </div>
        </div>
      ) : null}
      {status ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${statusColours[effectiveStatusTone]}`.trim()}
        >
          {status}
        </p>
      ) : null}
      {formError || externalError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {formError ?? externalError}
        </p>
      ) : null}
      {beforeFields}
      {fieldsContent}
      {afterFields}
      <button
        type="submit"
        disabled={actualSubmitting}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
      >
        {actualSubmitting ? busyLabel : submitLabel}
      </button>
      {footer ? <Fragment>{footer}</Fragment> : null}
    </form>
  );
}

AuthForm.propTypes = {
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string,
      type: PropTypes.string,
      placeholder: PropTypes.string,
      required: PropTypes.bool,
      helper: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
      hidden: PropTypes.bool,
      component: PropTypes.string,
      render: PropTypes.func,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
        })
      )
    })
  ),
  initialValues: PropTypes.object,
  validator: PropTypes.func,
  onSubmit: PropTypes.func.isRequired,
  submitLabel: PropTypes.string,
  busyLabel: PropTypes.string,
  isSubmitting: PropTypes.bool,
  status: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  statusTone: PropTypes.oneOf(['info', 'warning', 'error', 'success']),
  beforeFields: PropTypes.node,
  afterFields: PropTypes.node,
  renderFields: PropTypes.func,
  footer: PropTypes.node,
  onValuesChange: PropTypes.func,
  showProgress: PropTypes.bool,
  progressLabel: PropTypes.string,
  externalError: PropTypes.string,
  analyticsTag: PropTypes.string
};
