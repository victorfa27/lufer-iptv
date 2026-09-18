import { Heart, Play } from "lucide-react";

export default function ChannelList({ channels, favorites, onFavorite, onSelect, selected }) {
  return (
    <div className="channel-list">
      {channels.length === 0 ? (
        <div className="empty-list">
          <p>No hay canales para mostrar.</p>
        </div>
      ) : (
        channels.map((channel, index) => {
          const key = channel.id || `${channel.name}-${index}`;
          const favorite = favorites.has(key);
          return (
            <div key={key} className={selected?.id === channel.id ? "channel-card selected" : "channel-card"} onClick={() => onSelect(channel)}>
              <div className="channel-logo">
                {channel.logo ? (
                  <img src={channel.logo} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <span>TV</span>
                )}
              </div>
              <div className="channel-info">
                <strong>{channel.name}</strong>
                <span>{channel.group}</span>
              </div>
              <button className="play-button" title="Reproducir" onClick={(e) => { e.stopPropagation(); onSelect(channel); }}>
                <Play size={15} fill="currentColor" />
              </button>
              <button className={favorite ? "favorite active" : "favorite"} title="Favorito" onClick={(e) => { e.stopPropagation(); onFavorite(key); }}>
                <Heart size={17} fill={favorite ? "currentColor" : "none"} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}