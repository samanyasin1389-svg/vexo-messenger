import { fileExt, formatSize, formatTime, mediaUrl } from '../api';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import VoicePlayer from './VoicePlayer.jsx';

export default function MessageBubble({ message: m, mine, isGroup, first, last, onOpenImage, onSave }) {
  const hasMedia = m.type === 'image' || m.type === 'video';
  const cls = [
    'msg',
    mine ? 'mine' : 'theirs',
    first ? 'first' : '',
    last ? 'last' : '',
    hasMedia ? 'has-media' : '',
    m.type === 'voice' ? 'has-voice' : '',
    m.pending ? 'pending' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      {!mine && isGroup && (
        <span className="msg-avatar">{last ? <Avatar user={m.sender} size={30} /> : null}</span>
      )}
      <div className="bubble">
        {!mine && isGroup && first && <div className="sender-name">{m.sender.displayName}</div>}

        {m.type === 'image' && (
          <button
            className="media-btn"
            onClick={() => onOpenImage?.({ src: mediaUrl(m.fileUrl), name: m.fileName })}
          >
            <img className="msg-media" src={mediaUrl(m.fileUrl)} alt={m.fileName || 'تصویر'} loading="lazy" />
          </button>
        )}

        {m.type === 'video' && <video className="msg-media" controls preload="metadata" src={mediaUrl(m.fileUrl)} />}

        {m.type === 'voice' && (
          <VoicePlayer src={m.fileUrl} durationHint={m.content} mine={mine} />
        )}

        {m.type === 'file' && (
          <a className="file-card" href={mediaUrl(m.fileUrl)} target="_blank" rel="noreferrer" download={m.fileName}>
            <span className="file-ext">{fileExt(m.fileName)}</span>
            <span className="file-meta">
              <strong dir="auto">{m.fileName}</strong>
              <small>{formatSize(m.fileSize)}</small>
            </span>
            <Icon name="download" size={18} className="file-dl" />
          </a>
        )}

        {m.content && m.type !== 'voice' && <p className="msg-text" dir="auto">{m.content}</p>}

        <span className="msg-meta">
          <time>{formatTime(m.createdAt)}</time>
          {mine && <Icon name={m.pending ? 'clock' : 'checkAll'} size={14} />}
        </span>
      </div>

      {onSave && !m.pending && (
        <div className="msg-actions">
          <button className="msg-action" title="ذخیره در پیام‌های ذخیره‌شده" onClick={() => onSave(m)}>
            <Icon name="bookmark" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
