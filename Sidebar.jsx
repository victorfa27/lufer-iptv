import { Film, Folder, Heart, ListVideo, Upload } from "lucide-react";

export default function Sidebar({
  groups,
  activeGroup,
  setActiveGroup,
  favoriteCount,
  showFavorites,
  setShowFavorites,
  onFile,
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
        <input type="file" accept=".m3u,.m3u8,text/plain" onChange={onFile} hidden />
      </label>

      <nav>
        <button className={!showFavorites && activeGroup === "all" ? "nav-item active" : "nav-item"} onClick={() => { setShowFavorites(false); setActiveGroup("all"); }}>
          <ListVideo size={18} /> Todos
        </button>
        <button className={showFavorites ? "nav-item active" : "nav-item"} onClick={() => setShowFavorites(true)}>
          <Heart size={18} /> Favoritos <b>{favoriteCount}</b>
        </button>
      </nav>

      <div className="side-title"><Folder size={15} /> Categorías</div>
      <div className="group-list">
        {groups.map((group) => (
          <button key={group} className={!showFavorites && activeGroup === group ? "group-item active" : "group-item"} onClick={() => { setShowFavorites(false); setActiveGroup(group); }}>
            <Film size={15} />
            <span>{group}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}