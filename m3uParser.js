function parseAttributes(line) {
  const attrs = {};
  const regex = /([\w-]+)="([^"]*)"/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

export function parseM3U(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const channels = [];
  let pending = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const comma = line.indexOf(",");
      const title = comma >= 0 ? line.slice(comma + 1).trim() : "Canal sin nombre";
      const attrs = parseAttributes(line);

      pending = {
        id: attrs["tvg-id"] || `${channels.length}-${title}`,
        name: attrs["tvg-name"] || title,
        logo: attrs["tvg-logo"] || "",
        group: attrs["group-title"] || "Sin categoría",
        url: "",
      };
      continue;
    }

    if (!line.startsWith("#") && pending) {
      pending.url = line;
      channels.push(pending);
      pending = null;
    }
  }

  return channels.filter((channel) => channel.url);
}

export async function parseM3UUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la lista (${response.status}).`);
  }
  const text = await response.text();
  return parseM3U(text);
}