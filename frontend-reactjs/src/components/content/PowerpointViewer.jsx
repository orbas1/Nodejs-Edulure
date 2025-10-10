import PropTypes from 'prop-types';

export default function PowerpointViewer({ url }) {
  return (
    <iframe
      title="PowerPoint preview"
      src={url}
      className="h-full w-full"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
    />
  );
}

PowerpointViewer.propTypes = {
  url: PropTypes.string.isRequired
};
