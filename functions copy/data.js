// Cloudflare Pages Function: GET /data
// Proxy server-side al Google Sheet publicado.
// Evita CORS y problemas de fetch desde el cliente.

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_uIRNruk-Dqg4aV21IPIS04XnhVmJPDJZB8qO94y8UXC6kZvetmMq77SOILJ-joGP-CmEf3KlryqI/pub?gid=388978604&single=true&output=csv';

export async function onRequest(context) {
  try {
    const r = await fetch(CSV_URL, {
      cf: { cacheTtl: 60, cacheEverything: true },
      redirect: 'follow'
    });
    const text = await r.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (e) {
    return new Response('Error fetching CSV: ' + e.message, { status: 502 });
  }
}
