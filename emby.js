const API = "/api/emby";

async function request(path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Accept: "application/json" },
  });

  const text = await r.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!r.ok) {
    throw new Error(
      data?.error || `Emby respondió ${r.status}${text ? `: ${text.slice(0, 160)}` : ""}`
    );
  }

  return data;
}

const qs = (params) => new URLSearchParams(params).toString();

export async function getLiveChannels() {
  const data = await request(
    `/Items?${qs({
      IncludeItemTypes: "TvChannel",
      Recursive: "true",
      SortBy: "SortName",
      SortOrder: "Ascending",
      Fields: "PrimaryImageAspectRatio,ChannelNumber,Overview,ImageTags",
      Limit: "500",
    })}`
  );
  return data?.Items || [];
}

export async function getMovies() {
  const data = await request(
    `/Items?${qs({
      IncludeItemTypes: "Movie",
      Recursive: "true",
      SortBy: "SortName",
      SortOrder: "Ascending",
      Fields: "PrimaryImageAspectRatio,Overview,ProductionYear,ImageTags",
      Limit: "500",
    })}`
  );
  return data?.Items || [];
}

export async function getSeries() {
  const data = await request(
    `/Items?${qs({
      IncludeItemTypes: "Series",
      Recursive: "true",
      SortBy: "SortName",
      SortOrder: "Ascending",
      Fields: "PrimaryImageAspectRatio,Overview,ProductionYear,ImageTags",
      Limit: "500",
    })}`
  );
  return data?.Items || [];
}

export async function getSeasons(seriesId) {
  const data = await request(
    `/Items?${qs({
      ParentId: seriesId,
      IncludeItemTypes: "Season",
      Recursive: "false",
      SortBy: "SortName",
      Fields: "PrimaryImageAspectRatio,ImageTags",
      Limit: "100",
    })}`
  );
  return data?.Items || [];
}

export async function getEpisodes(seriesId, seasonId) {
  const data = await request(
    `/Items?${qs({
      ParentId: seasonId,
      IncludeItemTypes: "Episode",
      Recursive: "false",
      SortBy: "SortName",
      Fields: "PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks",
      Limit: "500",
    })}`
  );
  return data?.Items || [];
}

/*
 * Important:
 * The old version tried to play Live TV with:
 * /Videos/{id}/stream?static=true
 *
 * That is not the normal Live TV playback flow. The Netlify function now
 * asks Emby for PlaybackInfo and returns a same-origin proxy URL.
 */
export async function getStreamUrl(item) {
  const id = item?.Id || item?.id;

  if (!id) {
    throw new Error("Contenido sin ID.");
  }

  const data = await request(`/stream/${encodeURIComponent(id)}`);

  if (!data?.url) {
    throw new Error(data?.error || "Emby no devolvió una URL de reproducción.");
  }

  return data.url;
}

export function getImageUrl(item) {
  if (item?.image) return item.image;

  const id = item?.Id || item?.id;
  const tag = item?.ImageTags?.Primary || item?.PrimaryImageTag;

  return id
    ? `${API}/image/${encodeURIComponent(id)}${
        tag ? `?tag=${encodeURIComponent(tag)}` : ""
      }`
    : "";
}
