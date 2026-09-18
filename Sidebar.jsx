import { Film, Folder, Heart, ListVideo, Upload } from "lucide-react";

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

      {savedLists.length > 0 && (
        <div className="saved-lists">
          <div className="side-title">Mis listas</div>

          {savedLists.map((item) => (
            <div className="saved-list-item" key={item.id}>
              <button
                className="saved-list-load"
                title={item.url}
                onClick={() => onLoadSaved(item)}
              >
                <ListVideo size={15} />
                <span>{item.name}</span>
              </button>

              <button
                className="saved-list-delete"
                title="Eliminar lista"
                onClick={() => onDeleteSaved(item.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <nav>
        <button
          className={
            !showFavorites && activeGroup === "all"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => {
            setShowFavorites(false);
            setActiveGroup("all");
          }}
        >
          <ListVideo size={18} />
          Todos
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

      <div className="side-title">
        <Folder size={15} />
        Categorías
      </div>

      <div className="group-list">
        {groups.map((group) => (
          <button
            key={group}
            className={
              !showFavorites && activeGroup === group
                ? "group-item active"
                : "group-item"
            }
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
    </aside>
  );
}
