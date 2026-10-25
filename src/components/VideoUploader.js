import React from 'react';
import MediaUploader from './MediaUploader';

// THE video upload component. Create Story, the Video Story page, mixed-media video blocks and the
// dedicated upload page all render this one component, so limits, progress, errors and preview
// behave identically everywhere. See MediaUploader for the props.
export default function VideoUploader(props) {
  return <MediaUploader {...props} kind="video" />;
}
