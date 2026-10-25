import React, { useRef } from 'react';
import Button from './Button';
import { useAccount } from '../context/AccountContext';

// Follow / Following toggle for any person. Renders nothing for the signed-in user themselves.
export default function FollowButton({ person, size = 'sm', fullWidth = false }) {
  const { isFollowing, toggleFollow } = useAccount();
  const lastTap = useRef(0);
  if (!person || person.id === 'me') return null;
  const following = isFollowing(person.id);
  return (
    <Button
      title={following ? 'Following' : 'Follow'}
      icon={following ? 'checkmark' : 'person-add-outline'}
      variant={following ? 'secondary' : 'accent'}
      size={size}
      fullWidth={fullWidth}
      accessibilityLabel={`${following ? 'Unfollow' : 'Follow'} ${person.name}`}
      onPress={() => {
        // Ignore an accidental double tap (it would follow and immediately unfollow).
        const now = Date.now();
        if (now - lastTap.current < 400) return;
        lastTap.current = now;
        toggleFollow(person.id);
      }}
    />
  );
}
