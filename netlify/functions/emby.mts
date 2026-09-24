const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function getConfig() {
  const EMBY_URL = process.env.EMBY_URL?.replace(/\/+$/, "");
  const EMBY_API_KEY = process.env.EMBY_API_KEY;
  const EMBY_USER_ID = process.env.EMBY_USER_ID;

  if (!EMBY_URL || !EMBY_API_KEY) {
    throw new Error(
      "Configura EMBY_URL y EMBY_API_KEY en Netlify."
    );
  }

  return { EMBY_URL, EMBY_API_KEY, EMBY_USER_ID };
}

function makeEmbyUrl(path, apiKey) {
  const base = getConfig().EMBY_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const target = new URL(`${base}${cleanPath}`);

  target.searchParams.delete("api_key");
  target.searchParams.set("api_key", apiKey);

  return target;
}

async function embyFetch(path, init = {}) {
  const { EMBY_API_KEY } = getConfig();
  const target = makeEmbyUrl(path, EMBY_API_KEY);

  const headers = new Headers(init.headers || {});
  headers.set("X-Emby-Token", EMBY_API_KEY);
  headers.set("Accept", headers.get("Accept") || "*/*");

  return fetch(target, {
    ...init,
    headers,
  });
}

async function readJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function getUserId() {
  const { EMBY_USER_ID } = getConfig();

  if (EMBY_USER_ID) {
    return EMBY_USER_ID;
  }

  const response = await embyFetch("/Users");

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener el usuario de Emby (${response.status}).`
    );
  }

  const users = await readJson(response);

  if (!Array.isArray(users) || !users.length) {
    throw new Error(
      "No se encontró ningún usuario de Emby. Agrega EMBY_USER_ID en Netlify."
    );
  }

  return users[0].Id;
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  return Buffer.from(padded, "base64").toString("utf8");
}

function sanitizeEmbyPath(path) {
  if (!path || !path.startsWith("/")) {
    throw new Error("Ruta de reproducción inválida.");
  }

  // Nunca permitimos que el navegador use este proxy como SSRF.
  if (path.includes("://") || path.startsWith("//")) {
    throw new Error("Destino de reproducción inválido.");
  }

  return path;
}

function removeApiKey(path) {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.delete("api_key");

  return `${url.pathname}${url.search}`;
}

function proxyUrlFor(path) {
  const encoded = encodeBase64Url(removeApiKey(path));
  return `/api/emby/proxy?path=${encodeURIComponent(encoded)}`;
}

function rewriteHlsPlaylist(text, upstreamUrl) {
  const lines = text.split(/\r?\n/);

  return lines
    .map((line) => {
      if (!line) return line;

      // URI="audio.m3u8" / URI="segment.ts" dentro de tags HLS.
      line = line.replace(/URI="([^"]+)"/g, (_match, uri) => {
        try {
          const absolute = new URL(uri, upstreamUrl);
          return `URI="${proxyUrlFor(
            `${absolute.pathname}${absolute.search}`
          )}"`;
        } catch {
          return `URI="${uri}"`;
        }
      });

      // Líneas de playlist que son URLs/rutas de segmentos o sub-playlists.
      if (!line.startsWith("#")) {
        try {
          const absolute = new URL(line, upstreamUrl);

          if (
            absolute.protocol === "http:" ||
            absolute.protocol === "https:"
          ) {
            return proxyUrlFor(
              `${absolute.pathname}${absolute.search}`
            );
          }
        } catch {
          // Conservamos la línea original si no puede resolverse.
        }
      }

      return line;
    })
    .join("\n");
}

async function createPlayback(itemId) {
  const { EMBY_API_KEY } = getConfig();
  const userId = await getUserId();

  const params = new URLSearchParams({
    UserId: userId,
    IsPlayback: "true",
    AutoOpenLiveStream: "true",
    MaxStreamingBitrate: "140000000",
    "X-Emby-Client": "Lufer IPTV",
    "X-Emby-Device-Name": "Lufer IPTV Web",
    "X-Emby-Device-Id": "lufer-iptv-web",
    "X-Emby-Client-Version": "3.0.0",
  });

  params.set("api_key", EMBY_API_KEY);

  const body = {
    Id: itemId,
    UserId: userId,
    IsPlayback: true,
    AutoOpenLiveStream: true,
    EnableDirectPlay: true,
    EnableDirectStream: true,
    EnableTranscoding: true,
    MaxStreamingBitrate: 140000000,
  };

  const response = await embyFetch(
    `/Items/${encodeURIComponent(itemId)}/PlaybackInfo?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    const detail =
      data?.ErrorCode ||
      data?.error ||
      data?.Message ||
      `HTTP ${response.status}`;

    throw new Error(`PlaybackInfo falló: ${detail}`);
  }

  const source = data?.MediaSources?.[0];

  if (!source) {
    throw new Error(
      "Emby no devolvió ninguna fuente de reproducción."
    );
  }

  // Preferimos la URL HLS que Emby genera para el cliente.
  let playbackPath =
    source.TranscodingUrl ||
    source.DirectStreamUrl ||
    "";

  if (!playbackPath && source.LiveStreamId) {
    playbackPath =
      `/LiveTv/LiveStreamFiles/${encodeURIComponent(
        source.LiveStreamId
      )}/hls/master.m3u8`;
  }

  if (!playbackPath) {
    throw new Error(
      "Emby devolvió la fuente, pero no una URL reproducible."
    );
  }

  const absolute = new URL(
    playbackPath,
    getConfig().EMBY_URL + "/"
  );

  // La API key nunca se entrega al navegador.
  absolute.searchParams.delete("api_key");

  return {
    url: proxyUrlFor(
      `${absolute.pathname}${absolute.search}`
    ),
    playSessionId: data?.PlaySessionId || null,
    liveStreamId: source?.LiveStreamId || null,
    protocol: source?.TranscodingSubProtocol || source?.Protocol || null,
    container:
      source?.TranscodingContainer || source?.Container || null,
  };
}

async function handleProxy(request, encodedPath) {
  const path = sanitizeEmbyPath(decodeBase64Url(encodedPath));

  const incomingRange = request.headers.get("range");

  const headers = new Headers({
    "X-Emby-Token": getConfig().EMBY_API_KEY,
    Accept: "*/*",
  });

  if (incomingRange) {
    headers.set("Range", incomingRange);
  }

  const upstream = await embyFetch(path, {
    headers,
  });

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";

  if (!upstream.ok) {
    const text = await upstream.text();

    return new Response(text || "Error en Emby.", {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  }

  const isHls =
    contentType.toLowerCase().includes("mpegurl") ||
    contentType.toLowerCase().includes("m3u8") ||
    path.toLowerCase().includes(".m3u8");

  if (isHls) {
    const playlist = await upstream.text();

    // Construimos la URL real de Emby para resolver referencias relativas.
    const upstreamUrl = makeEmbyUrl(path, getConfig().EMBY_API_KEY);

    const rewritten = rewriteHlsPlaylist(
      playlist,
      upstreamUrl.toString()
    );

    return new Response(rewritten, {
      status: upstream.status,
      headers: {
        "content-type": "application/vnd.apple.mpegurl",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  }

  const responseHeaders = new Headers({
    "content-type": contentType,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });

  for (const name of [
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export default async (request) => {
  try {
    getConfig();

    const url = new URL(request.url);
    const route = url.pathname.replace(/^\/api\/emby\/?/, "");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type,Range",
        },
      });
    }

    const streamMatch = route.match(/^stream\/([^/]+)$/);

    if (streamMatch && request.method === "GET") {
      const result = await createPlayback(
        decodeURIComponent(streamMatch[1])
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const proxyMatch = route.match(/^proxy$/);

    if (proxyMatch && request.method === "GET") {
      const encodedPath = url.searchParams.get("path");

      if (!encodedPath) {
        return new Response(
          JSON.stringify({ error: "Falta el parámetro path." }),
          { status: 400, headers: jsonHeaders }
        );
      }

      return handleProxy(request, encodedPath);
    }

    const imageMatch = route.match(/^image\/([^/]+)$/);

    if (imageMatch && request.method === "GET") {
      const tag = url.searchParams.get("tag");

      let path =
        `/Items/${encodeURIComponent(
          imageMatch[1]
        )}/Images/Primary`;

      if (tag) {
        path += `?tag=${encodeURIComponent(tag)}`;
      }

      const upstream = await embyFetch(path, {
        headers: { Accept: "image/*,*/*" },
      });

      const headers = new Headers({
        "cache-control": "public, max-age=3600",
        "access-control-allow-origin": "*",
      });

      const contentType = upstream.headers.get("content-type");
      if (contentType) headers.set("content-type", contentType);

      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    }

    // Resto de la API de catálogo: se mantiene como proxy JSON.
    const params = new URLSearchParams(url.search);
    params.delete("api_key");

    const upstreamPath =
      `/${route}${params.toString() ? `?${params.toString()}` : ""}`;

    const upstream = await embyFetch(upstreamPath, {
      headers: { Accept: "application/json" },
    });

    const data = await readJson(upstream);

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Lufer IPTV Emby function:", error);

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          "Error interno conectando con Emby.",
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    );
  }
};
