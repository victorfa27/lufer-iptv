import { useMemo, useState } from "react";
import {
  Heart,
  Link2,
  Search,
  Settings2,
  Tv,
  Upload,
  X,
  RefreshCw,
  Play,
} from "lucide-react";
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
  const [savedLists, setSavedLists] = useState(
    () => JSON.parse(localStorage.getItem("lufer-lists") || "[]")
  );
  const [search, setSearch] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("Tu televisión, en un solo lugar.");
  const [loading, setLoading] = useState(false);

  const groups = useMemo(() => {
    const values = [...new Set(channels.map((c) => c.group || "Sin categoría"))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [channels]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return channels.filter((channel) => {
      const inGroup = activeGroup === "all" || channel.group === activeGroup;
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

  function applyChannels(parsed, source) {
    setChannels(parsed);
    setSelected(parsed[0] || null);
    setActiveGroup("all");
    setShowFavorites(false);
    setSearch("");
    setMessage(
      parsed.length
        ? `${parsed.length.toLocaleString()} canales disponibles`
        : `No encontramos canales en ${source}.`
    );
  }

  async function loadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      applyChannels(parseM3U(text), file.name);
    } catch {
      setMessage("No se pudo procesar el archivo M3U.");
    }
    event.target.value = "";
  }

  async function loadUrl(event) {
    event?.preventDefault();
    const value = url.trim();
    if (!value) return;
    setLoading(true);
    setMessage("Conectando con tu lista...");
    try {
      const parsed = await parseM3UUrl(value);
      applyChannels(parsed, "la URL");
    } catch (error) {
      setMessage(error.message || "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  }

  function saveList() {
    const value = url.trim();
    if (!value) {
      setMessage("Pega primero una URL M3U.");
      return;
    }
    const existing = savedLists.find((item) => item.url === value);
    if (existing) {
      setMessage(`"${existing.name}" ya está en Mis listas.`);
      return;
    }
    const name = window.prompt(
      "Nombre de la lista:",
      `Lista ${savedLists.length + 1}`
    );
    if (!name?.trim()) return;
    const item = {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: value,
      channels: channels.length,
    };
    const next = [...savedLists, item];
    setSavedLists(next);
    localStorage.setItem("lufer-lists", JSON.stringify(next));
    setMessage(`"${item.name}" guardada en Mis listas.`);
  }

  function deleteList(id) {
    const item = savedLists.find((list) => list.id === id);
    if (!item) return;
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    const next = savedLists.filter((list) => list.id !== id);
    setSavedLists(next);
    localStorage.setItem("lufer-lists", JSON.stringify(next));
  }

  async function loadSavedList(item) {
    setUrl(item.url);
    setLoading(true);
    setMessage(`Cargando ${item.name}...`);
    try {
      const parsed = await parseM3UUrl(item.url);
      applyChannels(parsed, item.name);
      const next = savedLists.map((x) =>
        x.id === item.id ? { ...x, channels: parsed.length } : x
      );
      setSavedLists(next);
      localStorage.setItem("lufer-lists", JSON.stringify(next));
    } catch (error) {
      setMessage(error.message || "No se pudo actualizar esta lista.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentList() {
    const current = savedLists.find((item) => item.url === url.trim());
    if (current) return loadSavedList(current);
    await loadUrl();
  }

  const stats = [
    { value: channels.length.toLocaleString(), label: "Canales" },
    { value: groups.length.toLocaleString(), label: "Categorías" },
    { value: favorites.size.toLocaleString(), label: "Favoritos" },
    { value: savedLists.length.toLocaleString(), label: "Mis listas" },
  ];

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
        savedLists={savedLists}
        onLoadSaved={loadSavedList}
        onDeleteSaved={deleteList}
      />

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">L</span>
            <span>LUFER IPTV</span>
          </div>
          <div className="page-title">
            <div className="eyebrow">LUFER IPTV · V2</div>
            <h1>Tu televisión, más simple.</h1>
            <p>{message}</p>
          </div>
          <button className="icon-button" title="Configuración">
            <Settings2 size={19} />
          </button>
        </header>

        {!channels.length ? (
          <section className="welcome-card">
            <div className="welcome-copy">
              <span className="live-pill"><span /> LISTO PARA VER</span>
              <h2>Empieza tu experiencia IPTV.</h2>
              <p>
                Carga una lista M3U, guarda tus listas favoritas y disfruta tus
                canales desde cualquier navegador compatible.
              </p>
              <div className="welcome-actions">
                <label className="primary-button">
                  <Upload size={17} />
                  Cargar archivo M3U
                  <input
                    type="file"
                    accept=".m3u,.m3u8,text/plain"
                    onChange={loadFile}
                    hidden
                  />
                </label>
                <a href="#lista" className="secondary-button">
                  <Link2 size={17} />
                  Usar una URL
                </a>
              </div>
            </div>
            <div className="welcome-orb">
              <div className="orb-ring">
                <Tv size={46} />
              </div>
            </div>
          </section>
        ) : (
          <section className="hero-strip">
            <div>
              <span className="live-pill"><span /> EN VIVO</span>
              <h2>{selected?.name || "Selecciona un canal"}</h2>
              <p>{selected?.group || "Explora tu programación"}</p>
            </div>
            <div className="hero-actions">
              <button onClick={() => setShowFavorites(true)} title="Favoritos">
                <Heart size={17} fill={showFavorites ? "currentColor" : "none"} />
                Favoritos
              </button>
              <button onClick={refreshCurrentList} disabled={loading}>
                <RefreshCw size={16} className={loading ? "spin" : ""} />
                Actualizar
              </button>
            </div>
          </section>
        )}

        <section className="url-box" id="lista">
          <form onSubmit={loadUrl}>
            <Link2 size={18} />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega aquí la URL de tu lista M3U..."
              aria-label="URL de lista M3U"
            />
            {url && (
              <button type="button" className="clear-url" onClick={() => setUrl("")}>
                <X size={16} />
              </button>
            )}
            <button type="submit" disabled={loading}>
              {loading ? "Cargando..." : "Cargar"}
            </button>
            <button
              type="button"
              className="save-list-button"
              onClick={saveList}
              disabled={!url.trim()}
            >
              Guardar
            </button>
          </form>
        </section>

        <section className="stats-row">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="content-grid">
          <div className="player-column">
            <Player channel={selected} />
          </div>

          <div className="channels-panel">
            <div className="list-header">
              <div>
                <div className="section-kicker">
                  {showFavorites ? "TU COLECCIÓN" : "PROGRAMACIÓN"}
                </div>
                <h2>
                  {showFavorites
                    ? "Favoritos"
                    : activeGroup === "all"
                    ? "Todos los canales"
                    : activeGroup}
                </h2>
                <span>{filtered.length.toLocaleString()} canales</span>
              </div>

              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar canal..."
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

            {filtered.length === 0 && channels.length > 0 && (
              <div className="empty-search">
                <Search size={26} />
                <strong>No encontramos ese canal</strong>
                <span>Prueba con otro nombre o cambia de categoría.</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
