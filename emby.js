const API = "/api/emby";

async function request(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`Emby respondió ${r.status}`);
  return r.json();
}
const qs = p => new URLSearchParams(p).toString();

export async function getLiveChannels() {
  const data = await request(`/Items?${qs({IncludeItemTypes:"TvChannel",Recursive:"true",SortBy:"SortName",SortOrder:"Ascending",Fields:"PrimaryImageAspectRatio,ChannelNumber,Overview,ImageTags",Limit:"500"})}`);
  return data.Items || [];
}
export async function getMovies() {
  const data = await request(`/Items?${qs({IncludeItemTypes:"Movie",Recursive:"true",SortBy:"SortName",SortOrder:"Ascending",Fields:"PrimaryImageAspectRatio,Overview,ProductionYear,ImageTags",Limit:"500"})}`);
  return data.Items || [];
}
export async function getSeries() {
  const data = await request(`/Items?${qs({IncludeItemTypes:"Series",Recursive:"true",SortBy:"SortName",SortOrder:"Ascending",Fields:"PrimaryImageAspectRatio,Overview,ProductionYear,ImageTags",Limit:"500"})}`);
  return data.Items || [];
}
export async function getSeasons(seriesId) {
  const data = await request(`/Items?${qs({ParentId:seriesId,IncludeItemTypes:"Season",Recursive:"false",SortBy:"SortName",Fields:"PrimaryImageAspectRatio,ImageTags",Limit:"100"})}`);
  return data.Items || [];
}
export async function getEpisodes(seriesId, seasonId) {
  const data = await request(`/Items?${qs({ParentId:seasonId,IncludeItemTypes:"Episode",Recursive:"false",SortBy:"SortName",Fields:"PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks",Limit:"500"})}`);
  return data.Items || [];
}
export async function getStreamUrl(item) {
  const id=item?.Id||item?.id;
  if (!id) throw new Error("Contenido sin ID.");
  const r=await fetch(`${API}/stream/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error("No se pudo obtener el stream.");
  const data=await r.json();
  return data.url;
}
export function getImageUrl(item) {
  if (item?.image) return item.image;
  const id=item?.Id||item?.id;
  const tag=item?.ImageTags?.Primary||item?.PrimaryImageTag;
  return id ? `${API}/image/${encodeURIComponent(id)}${tag?`?tag=${encodeURIComponent(tag)}`:""}` : "";
}
