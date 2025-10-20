import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import DashboardStateMessage from '../../dashboard/DashboardStateMessage.jsx';

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});
const INPUT_BASE_CLASSES =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:cursor-not-allowed disabled:bg-slate-100';

function toDateTimeLocalValue(value) {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (input) => input.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toArrayFromInput(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseJsonInput(value) {
  if (!value || typeof value !== 'string') {
    return value ? { ...value } : {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    throw new Error('Metadata must be valid JSON.');
  }
}

function createInitialValues(fields) {
  return fields.reduce((acc, field) => {
    if (field.defaultValue !== undefined) {
      acc[field.name] = field.defaultValue;
      return acc;
    }
    if (field.type === 'checkbox') {
      acc[field.name] = false;
    } else {
      acc[field.name] = '';
    }
    return acc;
  }, {});
}

function mapItemToForm(item, fields) {
  return fields.reduce((acc, field) => {
    const value = field.toInput ? field.toInput(item) : item?.[field.source ?? field.name];
    if (field.type === 'checkbox') {
      acc[field.name] = Boolean(value);
    } else if (field.type === 'datetime') {
      acc[field.name] = toDateTimeLocalValue(value);
    } else if (field.type === 'tags') {
      acc[field.name] = Array.isArray(value) ? value.join(', ') : value ?? '';
    } else if (field.type === 'json') {
      acc[field.name] = value ? JSON.stringify(value, null, 2) : '';
    } else if (field.type === 'number') {
      acc[field.name] = value === null || value === undefined ? '' : String(value);
    } else {
      acc[field.name] = value ?? '';
    }
    return acc;
  }, createInitialValues(fields));
}

function buildPayload({ fields, formValues, editing, context }) {
  const payload = {};
  fields.forEach((field) => {
    if (field.readOnly) return;
    const rawValue = formValues[field.name];
    const transformer = field.fromInput;

    if (transformer) {
      const transformed = transformer(rawValue, { editing, context });
      if (transformed !== undefined) {
        payload[field.name] = transformed;
      }
      return;
    }

    switch (field.type) {
      case 'number': {
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          payload[field.name] = field.allowEmpty ? null : undefined;
        } else {
          const numeric = Number(rawValue);
          if (!Number.isFinite(numeric)) {
            throw new Error(`${field.label} must be a valid number.`);
          }
          payload[field.name] = numeric;
        }
        break;
      }
      case 'checkbox':
        payload[field.name] = Boolean(rawValue);
        break;
      case 'datetime':
        payload[field.name] = rawValue ? new Date(rawValue) : field.allowEmpty ? null : undefined;
        break;
      case 'tags': {
        const arrayValue = toArrayFromInput(rawValue);
        payload[field.name] = arrayValue;
        break;
      }
      case 'json':
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          payload[field.name] = field.allowEmpty ? {} : undefined;
        } else {
          payload[field.name] = parseJsonInput(rawValue);
        }
        break;
      default:
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          payload[field.name] = field.allowEmpty ? null : undefined;
        } else {
          payload[field.name] = rawValue;
        }
    }
  });
  return payload;
}

export default function AdminCrudResource({
  token,
  title,
  description,
  entityName,
  listRequest,
  createRequest,
  updateRequest,
  deleteRequest,
  fields,
  columns,
  statusOptions,
  searchPlaceholder,
  emptyState,
  context,
  createLabel,
  onItemsChange,
  onSelectItem,
  selectedId,
  disabled
}) {
  const initialValues = useMemo(() => createInitialValues(fields), [fields]);
  const [items, setItems] = useState(EMPTY_ARRAY);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formValues, setFormValues] = useState(initialValues);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadItems = useCallback(
    async (signal) => {
      if (!token || !listRequest) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (search) {
          params.search = search;
        }
        if (statusFilter) {
          params.status = statusFilter;
        }
        const response = await listRequest({ token, params, signal, context });
        const data = response?.data ?? [];
        const meta = response?.meta ?? {};
        setItems(data);
        setPagination(meta.pagination ?? null);
        onItemsChange?.(data);
      } catch (requestError) {
        if (requestError?.name === 'AbortError' || requestError?.name === 'CanceledError') {
          return;
        }
        setError(requestError.message ?? 'Unable to load data');
      } finally {
        setLoading(false);
      }
    },
    [token, listRequest, search, statusFilter, context, onItemsChange]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadItems(controller.signal);
    return () => controller.abort();
  }, [loadItems]);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const resetForm = useCallback(() => {
    setFormValues(initialValues);
    setEditing(null);
    setFormVisible(false);
    setStatusMessage(null);
  }, [initialValues]);

  const openCreateForm = () => {
    setEditing(null);
    setFormValues(initialValues);
    setFormVisible(true);
    setStatusMessage(null);
  };

  const openEditForm = (item) => {
    setEditing(item);
    setFormValues(mapItemToForm(item, fields));
    setFormVisible(true);
    setStatusMessage(null);
  };

  const handleFieldChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token || !createRequest || !updateRequest) {
      return;
    }
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = buildPayload({ fields, formValues, editing, context });
      const request = editing
        ? updateRequest({ token, id: editing.id, payload, context })
        : createRequest({ token, payload, context });
      await request;
      setStatusMessage({ type: 'success', text: `${entityName ?? 'Record'} saved successfully.` });
      resetForm();
      await loadItems();
    } catch (submissionError) {
      setStatusMessage({ type: 'error', text: submissionError.message ?? 'Unable to save record.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!token || !deleteRequest) {
      return;
    }
    const confirmed = window.confirm(`Delete this ${entityName ?? 'record'}?`);
    if (!confirmed) {
      return;
    }
    try {
      await deleteRequest({ token, id: item.id, context });
      setStatusMessage({ type: 'success', text: `${entityName ?? 'Record'} deleted.` });
      if (editing?.id === item.id) {
        resetForm();
      }
      await loadItems();
    } catch (deleteError) {
      setStatusMessage({ type: 'error', text: deleteError.message ?? 'Unable to delete record.' });
    }
  };

  const renderField = (field) => {
    const value = formValues[field.name];

    if (typeof field.renderInput === 'function') {
      return field.renderInput({
        value,
        onChange: (nextValue) => handleFieldChange(field.name, nextValue),
        submitting,
        disabled,
        formValues,
        field,
        editing,
        context
      });
    }

    const commonProps = {
      id: field.name,
      name: field.name,
      disabled: submitting || disabled,
      required: field.required,
      onChange: (event) => {
        const target = event.target;
        if (field.type === 'checkbox') {
          handleFieldChange(field.name, target.checked);
        } else {
          handleFieldChange(field.name, target.value);
        }
      },
      className: INPUT_BASE_CLASSES,
      ...field.inputProps
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={field.rows ?? 4}
            placeholder={field.placeholder}
            value={value}
            className={clsx(commonProps.className, 'min-h-[120px] align-top')}
          />
        );
      case 'select':
        return (
          <select {...commonProps} value={value} className={clsx(commonProps.className, 'bg-white')}>
            <option value="">{field.placeholder ?? 'Select option'}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            {...commonProps}
            checked={Boolean(value)}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            step={field.step ?? '1'}
            min={field.min}
            max={field.max}
            {...commonProps}
            value={value}
            placeholder={field.placeholder}
          />
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            {...commonProps}
            value={value}
            placeholder={field.placeholder}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            {...commonProps}
            value={value}
            placeholder={field.placeholder ?? 'https://example.com'}
            inputMode="url"
            pattern={field.pattern}
          />
        );
      case 'tags':
        return (
          <input
            type="text"
            {...commonProps}
            value={value}
            placeholder={field.placeholder ?? 'Comma separated values'}
          />
        );
      case 'json':
        return (
          <textarea
            {...commonProps}
            rows={field.rows ?? 6}
            value={value}
            placeholder={field.placeholder ?? '{ }'}
            className={clsx(commonProps.className, 'font-mono text-xs')}
          />
        );
      default:
        return <input type="text" {...commonProps} value={value} placeholder={field.placeholder} />;
    }
  };

  const renderItems = () => {
    if (loading) {
      return (
        <div className="dashboard-card-muted p-6 text-sm text-slate-500">
          Loading {entityName ?? 'records'}...
        </div>
      );
    }

    if (error) {
      return (
        <DashboardStateMessage
          tone="error"
          title={`Unable to load ${entityName ?? 'records'}`}
          description={error}
          actionLabel="Retry"
          onAction={() => loadItems()}
        />
      );
    }

    if (!items.length) {
      if (emptyState) {
        return emptyState;
      }
      return (
        <DashboardStateMessage
          title={`No ${entityName ?? 'records'} found`}
          description="Create a new entry to get started."
          actionLabel={`Create ${entityName ?? 'record'}`}
          onAction={openCreateForm}
        />
      );
    }

    return (
      <ul className="space-y-4">
        {items.map((item) => {
          const isSelected = selectedId && selectedId === item.id;
          return (
            <li
              key={item.id}
              className={clsx(
                'dashboard-card-muted p-5 transition hover:border-primary/60 hover:bg-primary/5',
                isSelected && 'border-primary shadow'
              )}
              onClick={() => onSelectItem?.(item)}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div key={column.key} className="text-sm text-slate-700">
                      {column.label ? (
                        <span className="mr-2 font-semibold text-slate-900">{column.label}:</span>
                      ) : null}
                      <span>{column.render ? column.render(item) : item[column.key]}</span>
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditForm(item);
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(item);
                    }}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="dashboard-section space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {statusOptions?.length ? (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 focus:border-primary focus:outline-none"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder ?? 'Search'}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            className="dashboard-primary-pill"
            onClick={openCreateForm}
            disabled={disabled}
          >
            {createLabel ?? `New ${entityName ?? 'record'}`}
          </button>
        </div>
      </header>

      <div>{renderItems()}</div>

      {pagination ? (
        <div className="text-xs text-slate-500">
          Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
        </div>
      ) : null}

      {formVisible ? (
        <form onSubmit={handleSubmit} className="dashboard-card p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {editing ? `Update ${entityName ?? 'record'}` : `Create ${entityName ?? 'record'}`}
            </h3>
            <p className="text-sm text-slate-600">
              {editing ? 'Update the fields below and save your changes.' : 'Fill in the fields to add a new entry.'}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => {
              const value = formValues[field.name];
              const preview = field.renderPreview
                ? field.renderPreview({
                    value,
                    formValues,
                    field,
                    editing,
                    onChange: (nextValue) => handleFieldChange(field.name, nextValue)
                  })
                : null;

              return (
                <label
                  key={field.name}
                  className={clsx('flex flex-col gap-2 text-sm text-slate-700', field.fullWidth && 'md:col-span-2')}
                >
                  <span className="font-semibold text-slate-900">
                    {field.label}
                    {field.required ? ' *' : ''}
                  </span>
                  <div className="space-y-2">
                    {renderField(field)}
                    {preview}
                  </div>
                  {field.helpText ? <span className="text-xs text-slate-500">{field.helpText}</span> : null}
                </label>
              );
            })}
          </div>
          {statusMessage ? (
            <div
              className={clsx(
                'rounded-xl border px-4 py-3 text-sm',
                statusMessage.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              )}
            >
              {statusMessage.text}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || disabled}
              className="dashboard-primary-pill"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

AdminCrudResource.propTypes = {
  token: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  entityName: PropTypes.string,
  listRequest: PropTypes.func.isRequired,
  createRequest: PropTypes.func.isRequired,
  updateRequest: PropTypes.func.isRequired,
  deleteRequest: PropTypes.func.isRequired,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['text', 'textarea', 'select', 'number', 'datetime', 'checkbox', 'tags', 'json', 'url']),
      placeholder: PropTypes.string,
      helpText: PropTypes.string,
      options: PropTypes.array,
      required: PropTypes.bool,
      defaultValue: PropTypes.any,
      fullWidth: PropTypes.bool,
      fromInput: PropTypes.func,
      toInput: PropTypes.func,
      allowEmpty: PropTypes.bool,
      renderInput: PropTypes.func,
      renderPreview: PropTypes.func,
      inputProps: PropTypes.object
    })
  ).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string,
      render: PropTypes.func
    })
  ).isRequired,
  statusOptions: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ),
  searchPlaceholder: PropTypes.string,
  emptyState: PropTypes.node,
  context: PropTypes.object,
  createLabel: PropTypes.string,
  onItemsChange: PropTypes.func,
  onSelectItem: PropTypes.func,
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disabled: PropTypes.bool
};

AdminCrudResource.defaultProps = {
  token: null,
  description: null,
  entityName: 'record',
  statusOptions: null,
  searchPlaceholder: null,
  emptyState: null,
  context: EMPTY_OBJECT,
  createLabel: null,
  onItemsChange: null,
  onSelectItem: null,
  selectedId: null,
  disabled: false
};
