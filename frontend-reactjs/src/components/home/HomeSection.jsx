import PropTypes from 'prop-types';
import clsx from 'clsx';

const SIZE_CLASSES = {
  default: 'max-w-6xl',
  snug: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-none'
};

const PAD_CLASSES = {
  default: 'py-24',
  tight: 'py-16',
  relaxed: 'py-28',
  loose: 'py-32',
  none: 'py-0'
};

export default function HomeSection({
  as: Component = 'div',
  children,
  className,
  pad = 'default',
  size = 'default',
  px = 'px-6',
  ...props
}) {
  const resolvedSize = SIZE_CLASSES[size] ?? size;
  const resolvedPad = PAD_CLASSES[pad] ?? pad;

  return (
    <Component
      className={clsx('mx-auto', px, resolvedSize, resolvedPad, className)}
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
