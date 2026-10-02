import { hueFor, mediaUrl } from '../api';
import Icon from './Icon.jsx';

/** Bookmark avatar for the user's private "saved messages" chat. */
export function SavedAvatar({ size = 44, className = '' }) {
  return (
    <span className={`avatar-wrap ${className}`} style={{ width: size, height: size }}>
      <span className="avatar avatar-saved" style={{ width: size, height: size }}>
        <Icon name="bookmarkFilled" size={Math.round(size * 0.46)} />
      </span>
    </span>
  );
}

/** Picks the right avatar for a chat list entry / header. */
export function ChatAvatar({ chat, size = 44, className = '' }) {
  if (chat.type === 'saved') return <SavedAvatar size={size} className={className} />;
  return (
    <Avatar
      user={chat.otherUser || { displayName: chat.title, avatarUrl: chat.avatarUrl, username: chat.id }}
      size={size}
      className={className}
    />
  );
}

export default function Avatar({ user, size = 44, title, online, className = '' }) {
  const label = title || user?.displayName || user?.username || '?';
  const letter = label.trim().charAt(0).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.42) };

  return (
    <span className={`avatar-wrap ${className}`} style={{ width: size, height: size }}>
      {user?.avatarUrl ? (
        <img className="avatar" src={mediaUrl(user.avatarUrl)} alt={label} style={style} loading="lazy" />
      ) : (
        <span
          className="avatar avatar-fallback"
          style={{ ...style, '--hue': hueFor(user?.username || label) }}
        >
          {letter}
        </span>
      )}
      {online && <i className="avatar-dot" />}
    </span>
  );
}
