import PropTypes from 'prop-types';
import clsx from 'clsx';

const SIZE_CLASSES = {
  default: 'max-w-6xl',
  snug: 'max-w-5xl',
  narrow: 'max-w-4xl',
  wide: 'max-w-7xl',
  full: 'max-w-none'
};

const PAD_CLASSES = {
  default: 'py-section-default',
  cozy: 'py-section-cozy',
  tight: 'py-section-tight',
  balanced: 'py-section-balanced',
  relaxed: 'py-section-loose',
  loose: 'py-section-loose',
  none: 'py-0'
};

const EDGE_CLASSES = {
  default: 'px-responsive-edge',
  edge: 'px-responsive-edge',
  snug: 'px-responsive-edge',
  wide: 'px-responsive-edge',
  flush: 'px-0',
  none: 'px-0'
};

export default function HomeSection({
  as: Component = 'div',
  children,
  className,
  pad = 'default',
  size = 'default',
  px = 'edge',
  ...props
}) {
  const resolvedSize = SIZE_CLASSES[size] ?? size;
  const resolvedPad = PAD_CLASSES[pad] ?? pad;
  const resolvedPx = EDGE_CLASSES[px] ?? px;

  return (
    <Component
      className={clsx('mx-auto', resolvedPx, resolvedSize, resolvedPad, className)}
      {...props}
    >
      {children}
    </Component>
  );
}

HomeSection.propTypes = {
  as: PropTypes.elementType,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  pad: PropTypes.string,
  size: PropTypes.string,
  px: PropTypes.string
};
