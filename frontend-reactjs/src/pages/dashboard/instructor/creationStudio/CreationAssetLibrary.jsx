import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import {
  ArrowUpRightIcon,
  DocumentDuplicateIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import {
  CREATION_TYPE_LABELS,
  CREATION_TYPE_ORDER,
  describeTemplateSchema,
  groupTemplatesByType
} from './creationStudioUtils.js';

function TemplateCard({ template, onStart }) {
  const stats = describeTemplateSchema(template);
  return (
    <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {CREATION_TYPE_LABELS[template.type] ?? template.type}
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">{template.title}</h4>
          <p className="mt-2 text-sm text-slate-600">{template.description}</p>
        </div>
        {template.isDefault && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Default</span>
        )}
      </div>
      <dl className="mt-4 grid gap-2 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <dt>Outline entries</dt>
          <dd className="font-semibold text-slate-700">{stats.outlineLength}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Asset recommendations</dt>
          <dd className="font-semibold text-slate-700">{stats.assetCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Best practice notes</dt>
          <dd className="font-semibold text-slate-700">{stats.bestPractices}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-500">
        {(template.governanceTags ?? []).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1">{tag}</span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onStart(template)}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
      >
        <SparklesIcon className="h-4 w-4" /> Start from template
      </button>
    </article>
  );
}

TemplateCard.propTypes = {
  template: PropTypes.shape({
    publicId: PropTypes.string,
    type: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    governanceTags: PropTypes.array,
    schema: PropTypes.object,
    isDefault: PropTypes.bool
  }).isRequired,
  onStart: PropTypes.func.isRequired
};

function compactObject(input = {}) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export default function CreationAssetLibrary({ templates, onCreateProject, creating, creationError }) {
  const [activeType, setActiveType] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formState, setFormState] = useState({
    title: '',
    summary: '',
    audience: '',
    goal: '',
    launchDate: '',
    price: '',
    currency: 'USD'
  });

  const grouped = useMemo(() => groupTemplatesByType(templates), [templates]);
  const filteredTemplates = useMemo(() => {
    if (activeType === 'all') {
      return templates;
    }
    return templates.filter((template) => template.type === activeType);
  }, [activeType, templates]);

  const handleStart = (template) => {
    setSelectedTemplate(template);
    setFormState((previous) => ({
      ...previous,
      title: template.title,
      summary: template.description ?? '',
      audience: template.schema?.idealAudience ?? '',
      goal: template.schema?.successMetric ?? ''
    }));
  };

  const handleClose = () => {
    setSelectedTemplate(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedTemplate) return;
    const amount = parseFloat(formState.price);
    const pricingPlan = Number.isFinite(amount)
      ? {
          plans: [
            {
              name: 'Primary',
              amountCents: Math.round(amount * 100),
              currency: formState.currency,
              billingInterval: 'one_time'
            }
          ],
          currency: formState.currency
        }
      : undefined;

    const payload = compactObject({
      title: formState.title.trim() || selectedTemplate.title,
      summary: formState.summary.trim() || selectedTemplate.description ?? '',
      type: selectedTemplate.type,
      templateId: selectedTemplate.publicId,
      metadata: compactObject({
        audience: formState.audience ? [formState.audience] : undefined,
        objectives: formState.goal ? [formState.goal] : undefined,
        launch: formState.launchDate ? { targetDate: formState.launchDate } : undefined,
        pricing: pricingPlan,
        publishingChannels: selectedTemplate.schema?.publishingChannels,
        defaults: selectedTemplate.schema?.defaults
      }),
      analyticsTargets: compactObject({
        keywords: selectedTemplate.schema?.analyticsTargets?.keywords,
        audiences: formState.audience ? [formState.audience] : selectedTemplate.schema?.analyticsTargets?.audiences,
        markets: selectedTemplate.schema?.analyticsTargets?.markets,
        goals: formState.goal ? [formState.goal] : selectedTemplate.schema?.analyticsTargets?.goals
      }),
      contentOutline: selectedTemplate.schema?.outline ?? []
    });

    Promise.resolve(onCreateProject(payload))
      .then(() => {
        setSelectedTemplate(null);
        setFormState({ title: '', summary: '', audience: '', goal: '', launchDate: '', price: '', currency: 'USD' });
      })
      .catch(() => {});
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Template library</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Jumpstart with curated blueprints</h2>
          <p className="mt-2 text-sm text-slate-600">
            Apply approved playbooks for courses, e-books, communities, and campaign-ready ad assets. Templates capture best practices, outline structure, and recommended media so every production launches with the right governance baked in.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            <DocumentDuplicateIcon className="h-4 w-4" /> {templates.length} templates
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            <ArrowUpRightIcon className="h-4 w-4" /> {grouped.size} categories
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {['all', ...CREATION_TYPE_ORDER].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`rounded-2xl border px-3 py-1 text-xs font-semibold transition ${
              activeType === type
                ? 'border-primary bg-primary text-white shadow'
                : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {CREATION_TYPE_LABELS[type] ?? type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No templates available for the selected type yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.publicId} template={template} onStart={handleStart} />
          ))}
        </div>
      )}

      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-10">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Create project</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{selectedTemplate.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Configure launch details for this project. You can refine curriculum, assets, and pricing once the draft is created.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:border-primary/40 hover:text-primary"
              >
                Close
              </button>
            </header>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="project-title" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </label>
                <input
                  id="project-title"
                  name="title"
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formState.title}
                  onChange={(event) => setFormState((state) => ({ ...state, title: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label htmlFor="project-summary" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Summary
                </label>
                <textarea
                  id="project-summary"
                  name="summary"
                  rows="3"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formState.summary}
                  onChange={(event) => setFormState((state) => ({ ...state, summary: event.target.value }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="project-audience" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Primary audience
                  </label>
                  <input
                    id="project-audience"
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formState.audience}
                    onChange={(event) => setFormState((state) => ({ ...state, audience: event.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="project-goal" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Success goal
                  </label>
                  <input
                    id="project-goal"
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formState.goal}
                    onChange={(event) => setFormState((state) => ({ ...state, goal: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="project-launch" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Target launch date
                  </label>
                  <input
                    id="project-launch"
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formState.launchDate}
                    onChange={(event) => setFormState((state) => ({ ...state, launchDate: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="project-price" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Price
                    </label>
                    <input
                      id="project-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={formState.price}
                      onChange={(event) => setFormState((state) => ({ ...state, price: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="project-currency" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Currency
                    </label>
                    <select
                      id="project-currency"
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={formState.currency}
                      onChange={(event) => setFormState((state) => ({ ...state, currency: event.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>

              {creationError && <p className="text-xs font-semibold text-rose-600">{creationError.message}</p>}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-primary/40 hover:text-primary"
                  onClick={handleClose}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full border border-primary/40 bg-primary px-5 py-2 text-xs font-semibold text-white shadow transition hover:bg-primary/90"
                  disabled={creating}
                >
                  {creating ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

CreationAssetLibrary.propTypes = {
  templates: PropTypes.arrayOf(TemplateCard.propTypes.template),
  onCreateProject: PropTypes.func,
  creating: PropTypes.bool,
  creationError: PropTypes.instanceOf(Error)
};

CreationAssetLibrary.defaultProps = {
  templates: [],
  onCreateProject: () => Promise.resolve(),
  creating: false,
  creationError: null
};
