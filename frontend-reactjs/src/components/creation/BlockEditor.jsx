import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  Bars3BottomLeftIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';

const BLOCK_TYPES = [
  { id: 'heading', label: 'Heading', description: 'Short section title rendered prominently.' },
  { id: 'paragraph', label: 'Paragraph', description: 'Long-form copy supporting the lesson or module.' },
  { id: 'media', label: 'Media embed', description: 'Video, audio, or image URL with optional caption.' },
  { id: 'callout', label: 'Callout', description: 'Highlight guidance, assignments, or compliance notes.' },
  { id: 'list', label: 'Checklist', description: 'Ordered steps or talking points rendered as a list.' }
];

const DEFAULT_BLOCK_DATA = {
  heading: { text: '', level: 2 },
  paragraph: { text: '' },
  media: { url: '', caption: '' },
  callout: { text: '', tone: 'info' },
  list: { items: [''] }
};

function resolveId(id, index) {
  if (id) return `${id}`;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block-${index}-${Date.now()}`;
}

function normaliseBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks
    .map((block, index) => {
      if (!block) return null;
      const type = BLOCK_TYPES.some((candidate) => candidate.id === block.type) ? block.type : 'paragraph';
      const data = typeof block.data === 'object' && block.data !== null ? block.data : DEFAULT_BLOCK_DATA[type];
      return {
        id: resolveId(block.id ?? block.blockId ?? block.key, index),
        type,
        data: {
          ...DEFAULT_BLOCK_DATA[type],
          ...data
        }
      };
    })
    .filter(Boolean);
}

function createBlock(type) {
  const resolvedType = BLOCK_TYPES.some((candidate) => candidate.id === type) ? type : 'paragraph';
  const base = DEFAULT_BLOCK_DATA[resolvedType];
  return {
    id: resolveId(null, Math.round(Math.random() * 1000)),
    type: resolvedType,
    data: Array.isArray(base)
      ? [...base]
      : typeof base === 'object'
      ? { ...base }
      : base
  };
}

function BlockToolbar({ onAdd, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BLOCK_TYPES.map((type) => (
        <button
          key={type.id}
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
          onClick={() => onAdd(type.id)}
          disabled={disabled}
        >
          <PlusIcon className="h-4 w-4" />
          Add {type.label.toLowerCase()}
        </button>
      ))}
    </div>
  );
}

BlockToolbar.propTypes = {
  onAdd: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

BlockToolbar.defaultProps = {
  disabled: false
};

function BlockHeader({
  index,
  total,
  type,
  onMove,
  onRemove,
  readOnly
}) {
  const typeMeta = BLOCK_TYPES.find((candidate) => candidate.id === type) ?? BLOCK_TYPES[0];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{typeMeta.label}</p>
        <p className="text-[11px] text-slate-500">{typeMeta.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Block {index + 1} of {total}
        </span>
        <div className="flex items-center gap-1 text-slate-500">
          <button
            type="button"
            className="rounded-full border border-transparent p-1 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            onClick={() => onMove(index, index - 1)}
            disabled={readOnly || index === 0}
            aria-label="Move block up"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-full border border-transparent p-1 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            onClick={() => onMove(index, index + 1)}
            disabled={readOnly || index === total - 1}
            aria-label="Move block down"
          >
            <ArrowDownIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-full border border-transparent p-1 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            onClick={() => onRemove(index)}
            disabled={readOnly}
            aria-label="Remove block"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

BlockHeader.propTypes = {
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  onMove: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  readOnly: PropTypes.bool
};

BlockHeader.defaultProps = {
  readOnly: false
};

function HeadingEditor({ block, onChange, readOnly }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`${block.id}-heading-text`}>
        Heading text
      </label>
      <input
        id={`${block.id}-heading-text`}
        type="text"
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
        value={block.data.text}
        placeholder="Module or lesson title"
        onChange={(event) => onChange({ ...block, data: { ...block.data, text: event.target.value } })}
        disabled={readOnly}
      />
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`${block.id}-heading-level`}>
        Heading level
      </label>
      <select
        id={`${block.id}-heading-level`}
        className="w-40 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
        value={block.data.level}
        onChange={(event) => onChange({ ...block, data: { ...block.data, level: Number(event.target.value) } })}
        disabled={readOnly}
      >
        {[1, 2, 3, 4].map((level) => (
          <option key={level} value={level}>
            Level {level}
          </option>
        ))}
      </select>
    </div>
  );
}

HeadingEditor.propTypes = {
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
    data: PropTypes.shape({ text: PropTypes.string, level: PropTypes.number })
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool
};

HeadingEditor.defaultProps = {
  readOnly: false
};

function ParagraphEditor({ block, onChange, readOnly }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`${block.id}-paragraph-text`}>
        Paragraph copy
      </label>
      <textarea
        id={`${block.id}-paragraph-text`}
        className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
        value={block.data.text}
        placeholder="Share guidance, context, or supporting copy."
        onChange={(event) => onChange({ ...block, data: { ...block.data, text: event.target.value } })}
        disabled={readOnly}
      />
    </div>
  );
}

ParagraphEditor.propTypes = HeadingEditor.propTypes;
ParagraphEditor.defaultProps = HeadingEditor.defaultProps;

function MediaEditor({ block, onChange, readOnly }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`${block.id}-media-url`}>
        Media URL
      </label>
      <input
        id={`${block.id}-media-url`}
        type="url"
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
        value={block.data.url}
        placeholder="https://example.com/asset.mp4"
        onChange={(event) => onChange({ ...block, data: { ...block.data, url: event.target.value } })}
        disabled={readOnly}
      />
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`${block.id}-media-caption`}>
        Caption (optional)
      </label>
      <input
        id={`${block.id}-media-caption`}
        type="text"
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
        value={block.data.caption}
        placeholder="Provide context for the embedded media."
        onChange={(event) => onChange({ ...block, data: { ...block.data, caption: event.target.value } })}
        disabled={readOnly}
      />
    </div>
  );
}

MediaEditor.propTypes = HeadingEditor.propTypes;
MediaEditor.defaultProps = HeadingEditor.defaultProps;

function CalloutEditor({ block, onChange, readOnly }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`${block.id}-callout-tone`}>
        Tone
      </label>
      <select
        id={`${block.id}-callout-tone`}
        className="w-40 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
        value={block.data.tone}
        onChange={(event) => onChange({ ...block, data: { ...block.data, tone: event.target.value } })}
        disabled={readOnly}
      >
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </select>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`${block.id}-callout-text`}>
        Callout copy
      </label>
      <textarea
        id={`${block.id}-callout-text`}
        className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
        value={block.data.text}
        placeholder="Surface action items, compliance reminders, or promotional copy."
        onChange={(event) => onChange({ ...block, data: { ...block.data, text: event.target.value } })}
        disabled={readOnly}
      />
    </div>
  );
}

CalloutEditor.propTypes = HeadingEditor.propTypes;
CalloutEditor.defaultProps = HeadingEditor.defaultProps;

function ListEditor({ block, onChange, readOnly }) {
  const handleItemChange = (index, value) => {
    const nextItems = [...block.data.items];
    nextItems[index] = value;
    onChange({ ...block, data: { ...block.data, items: nextItems } });
  };

  const handleAddItem = () => {
    onChange({ ...block, data: { ...block.data, items: [...block.data.items, ''] } });
  };

  const handleRemoveItem = (index) => {
    const nextItems = block.data.items.filter((_, itemIndex) => itemIndex !== index);
    onChange({ ...block, data: { ...block.data, items: nextItems.length ? nextItems : [''] } });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Checklist items</p>
      <ol className="space-y-3">
        {block.data.items.map((item, index) => (
          <li key={`${block.id}-item-${index}`} className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
              value={item}
              placeholder={`Step ${index + 1}`}
              onChange={(event) => handleItemChange(index, event.target.value)}
              disabled={readOnly}
            />
            <button
              type="button"
              className="rounded-2xl border border-transparent px-3 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-40"
              onClick={() => handleRemoveItem(index)}
              disabled={readOnly || block.data.items.length === 1}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
        onClick={handleAddItem}
        disabled={readOnly}
      >
        <PlusIcon className="h-4 w-4" />
        Add checklist item
      </button>
    </div>
  );
}

ListEditor.propTypes = HeadingEditor.propTypes;
ListEditor.defaultProps = HeadingEditor.defaultProps;

function renderEditor({ block, onChange, readOnly }) {
  switch (block.type) {
    case 'heading':
      return <HeadingEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'paragraph':
      return <ParagraphEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'media':
      return <MediaEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'callout':
      return <CalloutEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'list':
      return <ListEditor block={block} onChange={onChange} readOnly={readOnly} />;
    default:
      return <ParagraphEditor block={block} onChange={onChange} readOnly={readOnly} />;
  }
}

export default function BlockEditor({ value, onChange, readOnly }) {
  const blocks = useMemo(() => normaliseBlocks(value), [value]);

  const handleCommit = useCallback(
    (nextBlocks) => {
      onChange(nextBlocks.map((block, index) => ({
        id: resolveId(block.id, index),
        type: block.type,
        data: block.data
      })));
    },
    [onChange]
  );

  const handleAddBlock = useCallback(
    (type) => {
      const nextBlocks = [...blocks, createBlock(type)];
      handleCommit(nextBlocks);
    },
    [blocks, handleCommit]
  );

  const handleRemoveBlock = useCallback(
    (index) => {
      const nextBlocks = blocks.filter((_, blockIndex) => blockIndex !== index);
      handleCommit(nextBlocks);
    },
    [blocks, handleCommit]
  );

  const handleMoveBlock = useCallback(
    (from, to) => {
      if (to < 0 || to >= blocks.length || from === to) {
        return;
      }
      const nextBlocks = [...blocks];
      const [moved] = nextBlocks.splice(from, 1);
      nextBlocks.splice(to, 0, moved);
      handleCommit(nextBlocks);
    },
    [blocks, handleCommit]
  );

  const handleUpdateBlock = useCallback(
    (index, updatedBlock) => {
      const nextBlocks = [...blocks];
      nextBlocks[index] = updatedBlock;
      handleCommit(nextBlocks);
    },
    [blocks, handleCommit]
  );

  const renderBlock = useCallback(
    (block, index) => {
      const icon =
        block.type === 'media' ? (
          <PhotoIcon className="h-5 w-5" />
        ) : block.type === 'callout' ? (
          <MegaphoneIcon className="h-5 w-5" />
        ) : block.type === 'list' ? (
          <Bars3BottomLeftIcon className="h-5 w-5" />
        ) : (
          <DocumentTextIcon className="h-5 w-5" />
        );

      return (
        <li key={block.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</span>
            <BlockHeader
              index={index}
              total={blocks.length}
              type={block.type}
              onMove={handleMoveBlock}
              onRemove={handleRemoveBlock}
              readOnly={readOnly}
            />
          </div>
          <div className="border-t border-dashed border-slate-200 pt-4 text-sm text-slate-700">
            {renderEditor({
              block,
              readOnly,
              onChange: (nextBlock) => handleUpdateBlock(index, nextBlock)
            })}
          </div>
        </li>
      );
    },
    [blocks.length, handleMoveBlock, handleRemoveBlock, handleUpdateBlock, readOnly]
  );

  return (
    <div className="space-y-6">
      <BlockToolbar onAdd={handleAddBlock} disabled={readOnly} />
      {blocks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No blocks yet. Start by adding a heading or paragraph to outline your lesson, then layer in callouts, media, or
          checklists as needed.
        </div>
      ) : (
        <ol className="space-y-4">{blocks.map((block, index) => renderBlock(block, index))}</ol>
      )}
    </div>
  );
}

BlockEditor.propTypes = {
  value: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.string,
      data: PropTypes.object
    })
  ),
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool
};

BlockEditor.defaultProps = {
  value: [],
  readOnly: false
};
