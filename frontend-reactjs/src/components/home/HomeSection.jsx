import PropTypes from 'prop-types';
import clsx from 'clsx';

const SIZE_CLASSES = {
  default: 'max-w-6xl',
  snug: 'max-w-5xl',
  narrow: 'max-w-4xl',
  wide: 'max-w-7xl',
  fluid: 'w-full max-w-7xl xl:max-w-none',
  full: 'w-full max-w-none'
};

const PAD_CLASSES = {
  default: 'py-16 sm:py-24',
  cozy: 'py-14 sm:py-20',
  tight: 'py-12 sm:py-16',
  balanced: 'py-16 sm:py-28',
  relaxed: 'py-20 sm:py-28',
  loose: 'py-24 sm:py-32',
  none: 'py-0'
};

const DEFAULT_GUTTER = 'px-4 sm:px-6 lg:px-10 xl:px-16';
const FULL_GUTTER = 'px-4 sm:px-6 lg:px-12 xl:px-20';

export default function HomeSection({
  as: Component = 'div',
  children,
  className,
  pad = 'default',
  size = 'default',
  px,
  ...props
}) {
  const resolvedSize = SIZE_CLASSES[size] ?? size;
  const resolvedPad = PAD_CLASSES[pad] ?? pad;
  const resolvedPx = typeof px === 'string' ? px : size === 'full' ? FULL_GUTTER : DEFAULT_GUTTER;

  return (
    <Component
      className={clsx('mx-auto w-full', resolvedPx, resolvedSize, resolvedPad, className)}
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
