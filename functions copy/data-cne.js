// Cloudflare Pages Function: GET /data-cne
// Proxy server-side al Google Sheet CNE (datos de trámites por proyecto).

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJDiNlfszmpzvZBqBOK1W1U2eC4x8Q3nYfJ_SnGg_h1RqbHdLG6XO34HhDadPNlKvnvB-WUjFOCFwm/pub?gid=1589427724&single=true&output=csv';

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
    return new Response('Error fetching CNE CSV: ' + e.message, { status: 502 });
  }
}
