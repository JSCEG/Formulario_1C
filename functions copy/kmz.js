// Cloudflare Pages Function: GET /kmz?url=<encoded_kmz_url>
// Proxy server-side para descargar KMZ de cualquier dominio.
// Evita CORS ya que el cliente fetcha mismo origen.

export async function onRequest(context) {
  const u = new URL(context.request.url);
  const target = u.searchParams.get('url');
  if (!target || !/^https?:\/\//.test(target)) {
    return new Response('Falta param url o no es http(s)', { status: 400 });
  }
  try {
    const r = await fetch(target, {
      cf: { cacheTtl: 600, cacheEverything: true },
      redirect: 'follow'
    });
    if (!r.ok) return new Response('Upstream HTTP ' + r.status, { status: 502 });
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': r.headers.get('content-type') || 'application/vnd.google-earth.kmz',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600'
      }
    });
  } catch (e) {
    return new Response('Error fetching KMZ: ' + e.message, { status: 502 });
  }
}
