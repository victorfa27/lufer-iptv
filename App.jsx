import "./styles-v3.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Search,
  Tv,
  Film,
  Play,
  Heart,
  Clock3,
  ListVideo,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import { parseM3U, parseM3UUrl } from "./m3uParser";
import {
  getLiveChannels,
  getMovies,
  getSeries,
  getSeasons,
  getEpisodes,
  getStreamUrl,
  getImageUrl,
} from "./emby";

const LS_FAV = "lufer-v3-favorites";
const LS_HISTORY = "lufer-v3-history";
const LS_LISTS = "lufer-v3-lists";

function readJSON(key, fallback) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );
  } catch {
    return fallback;
  }
}

export default function App() {
  const [section, setSection] = useState("home");
  const [live, setLive] = useState([]);
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Preparando Lufer IPTV V3...");
  const [favorites, setFavorites] = useState(() => readJSON(LS_FAV, []));
  const [history, setHistory] = useState(() => readJSON(LS_HISTORY, []));
  const [savedLists, setSavedLists] = useState(() => readJSON(LS_LISTS, []));
  const [m3uChannels, setM3uChannels] = useState([]);
  const [m3uUrl, setM3uUrl] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [seriesDetail, setSeriesDetail] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    localStorage.setItem(LS_FAV, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(LS_HISTORY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(LS_LISTS, JSON.stringify(savedLists));
  }, [savedLists]);

  async function loadEmby(type) {
    setLoading(true);
    setMessage("Cargando catálogo...");

    try {
      if (type === "live") setLive(await getLiveChannels());
      if (type === "movies") setMovies(await getMovies());
      if (type === "series") setSeries(await getSeries());

      setMessage("Catálogo actualizado.");
    } catch (e) {
      setMessage(e.message || "No fue posible conectar con Emby.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (section === "live" && !live.length) loadEmby("live");
    if (section === "movies" && !movies.length) loadEmby("movies");
    if (section === "series" && !series.length) loadEmby("series");
  }, [section]);

  function toggleFav(item) {
    const id = item.Id || item.id;
    setFavorites((x) =>
      x.includes(id) ? x.filter((v) => v !== id) : [...x, id]
    );
  }

  function play(item, kind = "emby") {
    setSelected({ ...item, kind });

    const id = item.Id || item.id;
    const entry = {
      id,
      name: item.Name || item.name,
      type: kind,
      item,
    };

    setHistory((x) => [
      entry,
      ...x.filter((v) => v.id !== id),
    ].slice(0, 30));
  }

  async function openSeries(item) {
    setSeriesDetail(item);
    setEpisodes([]);

    try {
      setSeasons(await getSeasons(item.Id));
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function openSeason(season) {
    try {
      setEpisodes(await getEpisodes(seriesDetail.Id, season.Id));
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function loadM3UUrl() {
    if (!m3uUrl.trim()) return;

    setLoading(true);

    try {
      setM3uChannels(await parseM3UUrl(m3uUrl.trim()));
      setSection("iptv");
    } catch (e) {
      setMessage(e.message || "No se pudo cargar la lista M3U.");
    } finally {
      setLoading(false);
    }
  }

  async function loadM3UFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setM3uChannels(parseM3U(await file.text()));
    setSection("iptv");
    e.target.value = "";
  }

  const allSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    return [
      ...live.map((x) => ({ ...x, _kind: "live" })),
      ...movies.map((x) => ({ ...x, _kind: "movie" })),
      ...series.map((x) => ({ ...x, _kind: "series" })),
      ...m3uChannels.map((x) => ({
        ...x,
        _kind: "iptv",
        Name: x.name,
      })),
    ]
      .filter((x) => (x.Name || "").toLowerCase().includes(q))
      .slice(0, 60);
  }, [search, live, movies, series, m3uChannels]);

  const title = {
    home: "Inicio",
    live: "TV en vivo",
    movies: "Películas",
    series: "Series",
    iptv: "Mis listas IPTV",
    favorites: "Mi lista",
    history: "Continuar viendo",
  }[section];

  return (
    <div className="v3-shell">
      <aside className={`v3-sidebar ${sidebar ? "open" : ""}`}>
        <div className="v3-brand">
          <span>VF</span>
          <b>LUFER IPTV</b>
          <button onClick={() => setSidebar(false)}>
            <X />
          </button>
        </div>

        {[
          ["home", "Inicio", Tv],
          ["live", "TV en vivo", Tv],
          ["movies", "Películas", Film],
          ["series", "Series", ListVideo],
          ["iptv", "Mis listas IPTV", ListVideo],
          ["favorites", "Mi lista", Heart],
          ["history", "Continuar viendo", Clock3],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            className={section === id ? "active" : ""}
            onClick={() => {
              setSection(id);
              setSidebar(false);
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}

        <label className="v3-upload">
          ＋ Cargar M3U
          <input
            hidden
            type="file"
            accept=".m3u,.m3u8,text/plain"
            onChange={loadM3UFile}
          />
        </label>
      </aside>

      <main className="v3-main">
        <header className="v3-header">
          <button className="v3-menu" onClick={() => setSidebar(true)}>
            <Menu />
          </button>

          <div>
            <small>LUFER IPTV · V3</small>
            <h1>{title}</h1>
          </div>

          <div className="v3-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar películas, series o canales..."
            />
          </div>

          <button
            className="v3-refresh"
            onClick={() => loadEmby(section)}
            disabled={loading}
          >
            <RefreshCw className={loading ? "spin" : ""} />
          </button>
        </header>

        {search && (
          <section className="v3-search-results">
            <h2>Resultados</h2>
            <Cards
              items={allSearch}
              onPlay={play}
              onSeries={openSeries}
              favorites={favorites}
              toggleFav={toggleFav}
            />
          </section>
        )}

        {!search && section === "home" && (
          <>
            <section className="v3-hero">
              <div>
                <span>LUFER IPTV V3</span>
                <h2>Tu entretenimiento en un solo lugar.</h2>
                <p>TV en vivo, películas, series y tus listas IPTV.</p>

                <div className="v3-actions">
                  <button onClick={() => setSection("live")}>
                    <Play size={17} /> Ver TV en vivo
                  </button>
                  <button
                    className="ghost"
                    onClick={() => setSection("movies")}
                  >
                    Explorar películas
                  </button>
                </div>
              </div>
            </section>

            <Row
              title="Continuar viendo"
              items={history.map((x) => x.item)}
              onPlay={(x) => play(x, "emby")}
            />

            <Row
              title="Películas"
              items={movies.slice(0, 12)}
              onPlay={(x) => play(x, "emby")}
              favorites={favorites}
              toggleFav={toggleFav}
            />
          </>
        )}

        {!search && section === "live" && (
          <>
            <Toolbar text={message} />
            <Cards
              items={live}
              onPlay={(x) => play(x, "live")}
              favorites={favorites}
              toggleFav={toggleFav}
            />
          </>
        )}

        {!search && section === "movies" && (
          <>
            <Toolbar text={message} />
            <Cards
              items={movies}
              onPlay={(x) => play(x, "movie")}
              favorites={favorites}
              toggleFav={toggleFav}
            />
          </>
        )}

        {!search && section === "series" && !seriesDetail && (
          <>
            <Toolbar text={message} />
            <Cards
              items={series}
              onSeries={openSeries}
              favorites={favorites}
              toggleFav={toggleFav}
            />
          </>
        )}

        {!search && section === "series" && seriesDetail && (
          <SeriesDetail
            item={seriesDetail}
            seasons={seasons}
            episodes={episodes}
            onSeason={openSeason}
            onPlay={(x) => play(x, "episode")}
            onBack={() => setSeriesDetail(null)}
          />
        )}

        {!search && section === "iptv" && (
          <IPTV
            channels={m3uChannels}
            url={m3uUrl}
            setUrl={setM3uUrl}
            onLoad={loadM3UUrl}
            onPlay={(x) => play(x, "iptv")}
          />
        )}

        {!search && section === "favorites" && (
          <Cards
            items={[...live, ...movies, ...series].filter((x) =>
              favorites.includes(x.Id)
            )}
            onPlay={(x) => play(x, "emby")}
            onSeries={openSeries}
            favorites={favorites}
            toggleFav={toggleFav}
          />
        )}

        {!search && section === "history" && (
          <Cards
            items={history.map((x) => x.item)}
            onPlay={(x) => play(x, "emby")}
          />
        )}

        {selected && (
          <VideoModal
            item={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </div>
  );
}

function Toolbar({ text }) {
  return (
    <div className="v3-toolbar">
      <span>{text}</span>
    </div>
  );
}

function Row({ title, items, onPlay, favorites, toggleFav }) {
  if (!items?.length) return null;

  return (
    <section className="v3-section">
      <div className="v3-section-title">
        <h2>{title}</h2>
      </div>

      <Cards
        items={items}
        onPlay={onPlay}
        favorites={favorites}
        toggleFav={toggleFav}
      />
    </section>
  );
}

function Cards({ items = [], onPlay, onSeries, favorites = [], toggleFav }) {
  return (
    <div className="v3-grid">
      {items.map((x, i) => (
        <article className="v3-card" key={x.Id || x.id || i}>
          <button
            className="v3-poster"
            onClick={() =>
              x._kind === "series" ||
              (!x.MediaSources && x.Type === "Series")
                ? onSeries?.(x)
                : onPlay?.(x)
            }
          >
            {x.ImageTags?.Primary ||
            x.PrimaryImageTag ||
            x.image ? (
              <img src={getImageUrl(x)} alt="" />
            ) : (
              <div className="poster-fallback">
                {x.Name || x.name || "Canal"}
              </div>
            )}

            <span className="v3-play">
              <Play fill="currentColor" size={18} />
            </span>
          </button>

          <div className="v3-card-info">
            <b>{x.Name || x.name}</b>
            <small>
              {x.ProductionYear || x.group || x.Type || "TV"}
            </small>
          </div>

          {toggleFav && (
            <button
              className="v3-fav"
              onClick={() => toggleFav(x)}
            >
              <Heart
                size={17}
                fill={
                  favorites?.includes(x.Id || x.id)
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function SeriesDetail({
  item,
  seasons,
  episodes,
  onSeason,
  onPlay,
  onBack,
}) {
  return (
    <section className="v3-detail">
      <button onClick={onBack}>← Regresar</button>
      <h2>{item.Name}</h2>

      <div className="season-list">
        {seasons.map((s) => (
          <button key={s.Id} onClick={() => onSeason(s)}>
            {s.Name}
          </button>
        ))}
      </div>

      <Cards items={episodes} onPlay={onPlay} />
    </section>
  );
}

function IPTV({ channels, url, setUrl, onLoad, onPlay }) {
  return (
    <section>
      <div className="v3-url">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL de lista M3U"
        />
        <button onClick={onLoad}>Cargar</button>
      </div>

      <Cards
        items={channels.map((x) => ({
          ...x,
          Name: x.name,
          _kind: "iptv",
        }))}
        onPlay={onPlay}
      />
    </section>
  );
}

function VideoModal({ item, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Conectando con Emby...");

  useEffect(() => {
    let hls;
    let cancelled = false;

    async function start() {
      try {
        setError("");
        setStatus("Obteniendo señal...");

        const url =
          item.kind === "iptv"
            ? item.item?.url
            : await getStreamUrl(item.item || item);

        if (!url) {
          throw new Error("No se recibió una URL de reproducción.");
        }

        if (cancelled || !videoRef.current) return;

        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data?.fatal) {
              setError(
                `Error HLS: ${data.details || "no se pudo iniciar la señal."}`
              );
              setStatus("");
              hls?.destroy();
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setStatus("");
            videoRef.current
              ?.play()
              .catch(() => setStatus("Presiona ▶ para iniciar."));
          });

          hls.loadSource(url);
          hls.attachMedia(videoRef.current);
        } else if (
          videoRef.current.canPlayType("application/vnd.apple.mpegurl")
        ) {
          videoRef.current.src = url;
          videoRef.current.onloadedmetadata = () => {
            setStatus("");
            videoRef.current?.play().catch(() => {});
          };
        } else {
          videoRef.current.src = url;
          setStatus("");
          videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "No se pudo reproducir.");
          setStatus("");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      hls?.destroy();

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    };
  }, [item]);

  return (
    <div className="v3-modal">
      <div className="v3-player">
        <button className="v3-close" onClick={onClose}>
          <X />
        </button>

        {error ? (
          <div className="v3-error">{error}</div>
        ) : (
          <>
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              preload="auto"
            />
            {status && <div className="v3-player-status">{status}</div>}
          </>
        )}

        <div className="v3-player-title">
          {item.Name || item.name}
        </div>
      </div>
    </div>
  );
}
