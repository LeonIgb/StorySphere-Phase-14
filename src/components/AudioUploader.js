import React from 'react';
import MediaUploader from './MediaUploader';

// Audio upload for mixed-media chapters. Same behaviour as the video uploader (see MediaUploader).
export default function AudioUploader(props) {
  return <MediaUploader {...props} kind="audio" />;
}
