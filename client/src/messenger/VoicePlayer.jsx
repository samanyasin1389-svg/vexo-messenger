import { useEffect, useRef, useState } from 'react';
import { formatDuration, mediaUrl } from '../api';
import Icon from '../components/Icon.jsx';

export default function VoicePlayer({ src, durationHint, mine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(Number(durationHint) || 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (!a.duration || !Number.isFinite(a.duration)) return;
      setProgress(a.currentTime / a.duration);
      setDuration(a.duration);
    };
    const onMeta = () => {
      if (a.duration && Number.isFinite(a.duration)) setDuration(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  function seek(e) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
    setProgress(ratio);
  }

  const bars = 28;
  const shown = playing
    ? Math.round(progress * bars)
    : Math.min(bars, Math.max(4, Math.round(((Number(durationHint) || duration || 1) / 30) * bars)));

  return (
    <div className={`voice-player ${mine ? 'mine' : ''}`}>
      <audio ref={audioRef} src={mediaUrl(src)} preload="metadata" />
      <button type="button" className="voice-play" onClick={toggle} aria-label={playing ? 'توقف' : 'پخش'}>
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
      <div className="voice-wave" onClick={seek} role="slider" aria-valuenow={Math.round(progress * 100)}>
        {Array.from({ length: bars }, (_, i) => (
          <i
            key={i}
            className={i < shown ? 'on' : ''}
            style={{ height: `${28 + ((i * 17) % 42)}%` }}
          />
        ))}
      </div>
      <span className="voice-time" dir="ltr">
        {formatDuration(playing ? progress * (duration || Number(durationHint) || 0) : duration || Number(durationHint) || 0)}
      </span>
    </div>
  );
}
