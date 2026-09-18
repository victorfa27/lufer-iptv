import {
  Film,
  Folder,
  Heart,
  ListVideo,
  Upload,
  Trash2,
  Tv,
} from "lucide-react";

export default function Sidebar({
  groups,
  activeGroup,
  setActiveGroup,
  favoriteCount,
  showFavorites,
  setShowFavorites,
  onFile,
  savedLists,
  onLoadSaved,
  onDeleteSaved,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">L</div>
        <div>
          <strong>LUFER</strong>
          <span>IPTV</span>
        </div>
      </div>

      <label className="import-button">
        <Upload size={17} />
        Cargar M3U
        <input
          type="file"
          accept=".m3u,.m3u8,text/plain"
          onChange={onFile}
          hidden
        />
      </label>

      <nav className="main-nav">
        <button
          className={!showFavorites && activeGroup === "all" ? "nav-item active" : "nav-item"}
          onClick={() => {
            setShowFavorites(false);
            setActiveGroup("all");
          }}
        >
          <Tv size={18} />
          Inicio
        </button>

        <button
          className={showFavorites ? "nav-item active" : "nav-item"}
          onClick={() => setShowFavorites(true)}
        >
          <Heart size={18} />
          Favoritos
          <b>{favoriteCount}</b>
        </button>
      </nav>

      <div className="side-section">
        <div className="side-title"><ListVideo size={15} /> Mis listas</div>
        {savedLists.length === 0 ? (
          <div className="saved-empty">Tus listas guardadas aparecerán aquí.</div>
        ) : (
          <div className="saved-list-stack">
            {savedLists.map((item) => (
              <div className="saved-list-item" key={item.id}>
                <button
                  className="saved-list-load"
                  title={item.url}
                  onClick={() => onLoadSaved(item)}
                >
                  <span className="saved-list-icon"><ListVideo size={14} /></span>
                  <span className="saved-list-text">
                    <strong>{item.name}</strong>
                    <small>{item.channels || 0} canales</small>
                  </span>
                </button>
                <button
                  className="saved-list-delete"
                  title="Eliminar lista"
                  onClick={() => onDeleteSaved(item.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="side-section categories-section">
        <div className="side-title"><Folder size={15} /> Categorías</div>
        <div className="group-list">
          {groups.map((group) => (
            <button
              key={group}
              className={!showFavorites && activeGroup === group ? "group-item active" : "group-item"}
              onClick={() => {
                setShowFavorites(false);
                setActiveGroup(group);
              }}
            >
              <Film size={15} />
              <span>{group}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <span>LUFER IPTV</span>
        <small>V2 · Web Player</small>
      </div>
    </aside>
  );
}
