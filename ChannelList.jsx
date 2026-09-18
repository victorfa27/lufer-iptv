import { Heart, Play } from "lucide-react";

export default function ChannelList({
  channels,
  favorites,
  onFavorite,
  onSelect,
  selected,
}) {
  return (
    <div className="channel-grid">
      {channels.map((channel, index) => {
        const key = channel.id || `${channel.name}-${index}`;
        const favorite = favorites.has(key);
        const isSelected = selected?.id === channel.id;

        return (
          <article
            key={key}
            className={isSelected ? "channel-tile selected" : "channel-tile"}
            onClick={() => onSelect(channel)}
          >
            <div className="tile-logo-wrap">
              {channel.logo ? (
                <img
                  src={channel.logo}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement.classList.add("logo-failed");
                  }}
                />
              ) : (
                <span className="tile-fallback">TV</span>
              )}

              <button
                className="tile-play"
                title={`Reproducir ${channel.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(channel);
                }}
              >
                <Play size={15} fill="currentColor" />
              </button>

              <button
                className={favorite ? "tile-favorite active" : "tile-favorite"}
                title="Favorito"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(key);
                }}
              >
                <Heart size={15} fill={favorite ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="tile-info">
              <strong title={channel.name}>{channel.name}</strong>
              <span title={channel.group}>{channel.group}</span>
            </div>
          </article>
        );
      })}

      {channels.length === 0 && (
        <div className="empty-list">
          <p>No hay canales para mostrar.</p>
        </div>
      )}
    </div>
  );
}
