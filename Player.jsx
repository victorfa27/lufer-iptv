import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function Player({ channel }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    const video = videoRef.current;
    if (!video || !channel?.url) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = channel.url;
    const isHls = /\.m3u8($|\?)/i.test(url);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) setError("No fue posible reproducir este canal.");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else {
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [channel]);

  if (!channel) {
    return (
      <div className="player-empty">
        <div className="player-empty-icon">▶</div>
        <h2>Selecciona un canal</h2>
        <p>Tu reproducción aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="player-wrap">
      <div className="video-shell">
        <video ref={videoRef} controls playsInline autoPlay />
        {error && <div className="player-error">{error}</div>}
      </div>
      <div className="now-playing">
        {channel.logo ? (
          <img src={channel.logo} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <div className="channel-fallback">TV</div>
        )}
        <div>
          <strong>{channel.name}</strong>
          <span>{channel.group}</span>
        </div>
      </div>
    </div>
  );
}