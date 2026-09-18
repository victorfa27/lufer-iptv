import { useMemo, useState } from "react";
import { Link2, Search, Settings2, Tv } from "lucide-react";
import Player from "./Player";
import Sidebar from "./Sidebar";
import ChannelList from "./ChannelList";
import { parseM3U, parseM3UUrl } from "./m3uParser";

export default function App() {
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeGroup, setActiveGroup] = useState("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState(
    () => new Set(JSON.parse(localStorage.getItem("lufer-favorites") || "[]"))
  );
  const [search, setSearch] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("Carga una lista M3U para comenzar.");

  const groups = useMemo(() => {
    const values = [...new Set(channels.map((c) => c.group || "Sin categoría"))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [channels]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return channels.filter((channel) => {
      const inGroup =
        activeGroup === "all" || channel.group === activeGroup;
      const isFavorite = favorites.has(channel.id);
      const inFavorites = !showFavorites || isFavorite;
      const inSearch =
        !q ||
        `${channel.name} ${channel.group}`.toLowerCase().includes(q);

      return inGroup && inFavorites && inSearch;
    });
  }, [channels, activeGroup, showFavorites, favorites, search]);

  function toggleFavorite(id) {
    const next = new Set(favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavorites(next);
    localStorage.setItem("lufer-favorites", JSON.stringify([...next]));
  }

  async function loadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseM3U(text);

      setChannels(parsed);
      setSelected(parsed[0] || null);
      setActiveGroup("all");
      setShowFavorites(false);
      setMessage(`${parsed.length} canales cargados desde ${file.name}.`);
    } catch {
      setMessage("No se pudo procesar el archivo M3U.");
    }
  }

  async function loadUrl(event) {
    event.preventDefault();
    if (!url.trim()) return;

    setMessage("Descargando lista M3U...");

    try {
      const parsed = await parseM3UUrl(url.trim());

      setChannels(parsed);
      setSelected(parsed[0] || null);
      setActiveGroup("all");
      setShowFavorites(false);
      setMessage(`${parsed.length} canales cargados desde la URL.`);
    } catch (error) {
      setMessage(
        error.message || "No se pudo cargar la URL. Puede requerir CORS."
      );
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        groups={groups}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        favoriteCount={favorites.size}
        showFavorites={showFavorites}
        setShowFavorites={setShowFavorites}
        onFile={loadFile}
      />

      <main className="main">
        <header className="topbar">
          <div className="page-title">
            <Tv size={21} />
            <div>
              <h1>Televisión</h1>
              <p>{message}</p>
            </div>
          </div>

          <button className="icon-button" title="Configuración">
            <Settings2 size={20} />
          </button>
        </header>

        <section className="url-box">
          <form onSubmit={loadUrl}>
            <Link2 size={18} />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega aquí la URL de tu lista M3U..."
            />
            <button type="submit">Cargar lista</button>
          </form>
        </section>

        <section className="content-grid">
          <div className="player-column">
            <Player channel={selected} />
          </div>

          <div className="channels-panel">
            <div className="list-header">
              <div>
                <h2>
                  {showFavorites
                    ? "Favoritos"
                    : activeGroup === "all"
                    ? "Todos los canales"
                    : activeGroup}
                </h2>
                <span>{filtered.length} canales</span>
              </div>

              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                />
              </div>
            </div>

            <ChannelList
              channels={filtered}
              favorites={favorites}
              onFavorite={toggleFavorite}
              onSelect={setSelected}
              selected={selected}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
