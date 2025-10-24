function titleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDocumentationLabel(href) {
  if (!href || typeof href !== 'string') {
    return 'Documentation';
  }

  const [path = '', anchor = ''] = href.split('#');
  const baseSegment = path.split('/').filter(Boolean).pop() ?? '';
  const baseLabel = titleCase(baseSegment.replace(/\.md$/i, '').replace(/[-_]/g, ' ').trim());
  const anchorLabel = titleCase(anchor.replace(/[-_]/g, ' ').trim());

  if (baseLabel && anchorLabel) {
    return `${baseLabel} • ${anchorLabel}`;
  }

  if (anchorLabel) {
    return anchorLabel;
  }

  if (baseLabel) {
    return baseLabel;
  }

  return 'Documentation';
}

export function isInternalDocumentationLink(href) {
  return typeof href === 'string' && href.startsWith('/');
}

export function formatCategoryLabel(category) {
  if (!category || typeof category !== 'string') {
    return 'Reference';
  }
  return titleCase(category.replace(/[-_]/g, ' ').trim());
}
