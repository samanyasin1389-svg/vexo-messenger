import { mediaUrl } from '../api';
import Avatar, { ChatAvatar } from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';

export default function ChatInfoPanel({ chat, messages, user, onClose, onOpenImage }) {
  const isGroup = chat.type === 'group';
  const isSaved = chat.type === 'saved';
  const media = messages.filter((m) => m.type === 'image').slice(-12).reverse();
  const files = messages.filter((m) => m.type === 'file').length;
  const other = chat.otherUser;

  return (
    <aside className="info-panel">
      <header className="info-head">
        <h3>{isSaved ? 'پیام‌های ذخیره‌شده' : isGroup ? 'اطلاعات گروه' : 'اطلاعات کاربر'}</h3>
        <button className="icon-btn" onClick={onClose} aria-label="بستن">
          <Icon name="x" size={18} />
        </button>
      </header>

      <div className="info-hero">
        <ChatAvatar chat={chat} size={96} />
        <strong>{chat.title}</strong>
        {other && <span dir="ltr">@{other.username}</span>}
        {isGroup && <span>{chat.members?.length || 0} عضو</span>}
        {isSaved && <span>فضای شخصی شما برای یادداشت و نگهداری پیام‌ها</span>}
      </div>

      {other?.bio && (
        <div className="info-block">
          <label>بیو</label>
          <p dir="auto">{other.bio}</p>
        </div>
      )}

      <div className="info-stats">
        <div>
          <strong>{messages.length}</strong>
          <span>پیام</span>
        </div>
        <div>
          <strong>{media.length}</strong>
          <span>تصویر</span>
        </div>
        <div>
          <strong>{files}</strong>
          <span>فایل</span>
        </div>
      </div>

      {isGroup && (
        <div className="info-block">
          <label>اعضا</label>
          <ul className="member-list">
            {chat.members?.map((m) => (
              <li key={m.id}>
                <Avatar user={m} size={36} />
                <div>
                  <strong>
                    {m.displayName} {m.id === user.id && <em>(شما)</em>}
                  </strong>
                  <span dir="ltr">@{m.username}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {media.length > 0 && (
        <div className="info-block">
          <label>تصاویر اخیر</label>
          <div className="media-grid">
            {media.map((m) => (
              <button key={m.id} onClick={() => onOpenImage({ src: mediaUrl(m.fileUrl), name: m.fileName })}>
                <img src={mediaUrl(m.fileUrl)} alt={m.fileName || ''} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
