export default async (request) => {
  const url = new URL(request.url);
  const EMBY_URL = process.env.EMBY_URL;
  const EMBY_API_KEY = process.env.EMBY_API_KEY;
  if (!EMBY_URL || !EMBY_API_KEY) return new Response(JSON.stringify({error:"Configura EMBY_URL y EMBY_API_KEY en Netlify."}), {status:500,headers:{"content-type":"application/json"}});
  const route = url.pathname.replace(/^\/api\/emby\/?/, "");
  let target;
  const streamMatch = route.match(/^stream\/([^/]+)$/);
  const imageMatch = route.match(/^image\/([^/]+)$/);
  if (streamMatch) {
    target = `${EMBY_URL.replace(/\/$/,"")}/Videos/${encodeURIComponent(streamMatch[1])}/stream?static=true&api_key=${encodeURIComponent(EMBY_API_KEY)}`;
    return new Response(JSON.stringify({url:target}), {headers:{"content-type":"application/json"}});
  }
  if (imageMatch) {
    const p = new URLSearchParams(url.search);
    const tag = p.get("tag");
    target = `${EMBY_URL.replace(/\/$/,"")}/Items/${encodeURIComponent(imageMatch[1])}/Images/Primary`;
    if (tag) target += `?tag=${encodeURIComponent(tag)}&api_key=${encodeURIComponent(EMBY_API_KEY)}`;
    else target += `?api_key=${encodeURIComponent(EMBY_API_KEY)}`;
  } else {
    const params = new URLSearchParams(url.search);
    params.set("api_key", EMBY_API_KEY);
    target = `${EMBY_URL.replace(/\/$/,"")}/${route}${params.toString()?"?"+params.toString():""}`;
  }
  const upstream = await fetch(target, {headers:{"Accept":"*/*"}});
  const headers = new Headers();
  const ct = upstream.headers.get("content-type"); if (ct) headers.set("content-type",ct);
  const cl = upstream.headers.get("content-length"); if (cl) headers.set("content-length",cl);
  return new Response(upstream.body,{status:upstream.status,headers});
};
