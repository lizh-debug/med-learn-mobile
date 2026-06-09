// Cloudflare Worker — proxies requests to DeepSeek API
// Keeps the API key server-side so it never appears in client code.
//
// Deploy:  npx wrangler deploy
//          (first time: npx wrangler login)
//
// Then set EXPO_PUBLIC_AI_PROXY_URL in .env to the worker URL.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only proxy /chat/completions
    if (request.method !== 'POST' || !url.pathname.endsWith('/chat/completions')) {
      return new Response('Not found', { status: 404 });
    }

    const deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';
    const proxyReq = new Request(deepseekUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: request.body,
    });

    const res = await fetch(proxyReq);

    // CORS headers so the web app can call from any origin
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const resHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      resHeaders.set(k, v);
    }

    return new Response(res.body, {
      status: res.status,
      headers: resHeaders,
    });
  },
};
