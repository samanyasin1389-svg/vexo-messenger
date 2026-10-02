import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { LogoMark } from '../components/Logo.jsx';

export default function NavRail({
  user,
  theme,
  onToggleTheme,
  onProfile,
  onNewGroup,
  onSaved,
  savedActive,
  onLogout,
  connection,
}) {
  return (
    <nav className="rail" aria-label="ناوبری اصلی">
      <div className="rail-logo" title="Vexo">
        <LogoMark size={44} glow={false} />
      </div>

      <div className="rail-group">
        <button className={`rail-btn ${savedActive ? '' : 'active'}`} title="گفتگوها">
          <Icon name="chat" size={22} />
        </button>
        <button className={`rail-btn ${savedActive ? 'active' : ''}`} title="پیام‌های ذخیره‌شده" onClick={onSaved}>
          <Icon name="bookmark" size={22} />
        </button>
        <button className="rail-btn" title="گروه جدید" onClick={onNewGroup}>
          <Icon name="users" size={22} />
        </button>
      </div>

      <div className="rail-group rail-bottom">
        <button className="rail-btn" title={theme === 'dark' ? 'تم روشن' : 'تم تیره'} onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={22} />
        </button>
        <button className="rail-btn" title="خروج" onClick={onLogout}>
          <Icon name="logout" size={22} />
        </button>
        <button className="rail-avatar" title="پروفایل من" onClick={onProfile}>
          <Avatar user={user} size={40} online={connection === 'online'} />
        </button>
      </div>
    </nav>
  );
}
