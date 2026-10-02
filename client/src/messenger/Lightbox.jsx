import { useEffect } from 'react';
import Icon from '../components/Icon.jsx';

export default function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span dir="auto">{item.name || 'تصویر'}</span>
        <div>
          <a className="icon-btn" href={item.src} download={item.name} title="دانلود">
            <Icon name="download" />
          </a>
          <button className="icon-btn" onClick={onClose} aria-label="بستن">
            <Icon name="x" />
          </button>
        </div>
      </div>
      <img src={item.src} alt={item.name || ''} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
