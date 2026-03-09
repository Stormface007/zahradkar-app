export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const payload = await request.json();
  console.log('Payload:', JSON.stringify(payload));
  
  // ← TVOJE GITHUB NICK ZDE (např. "tvoj-nick")
  const REPO_OWNER = 'Stormface007';  
  const REPO_NAME = 'zahradkar-app';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  
  if (!GITHUB_TOKEN) {
    return new Response('GITHUB_TOKEN missing', { status: 500 });
  }
  
  const dispatchUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/code-agent.yml/dispatches`;
  
  console.log('Dispatching to:', dispatchUrl);
  
  const response = await fetch(dispatchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        feature: payload.feature || 'unknown',
        description: payload.description || 'AI generated',
        files: (payload.files || []).join(',')
      }
    })
  });
  
  const result = await response.json();
  console.log('GitHub result:', JSON.stringify(result));
  
  if (response.ok) {
    return new Response(JSON.stringify({ success: true, workflow_id: result.id }), { status: 200 });
  } else {
    return new Response(JSON.stringify({ error: result.message }), { status: response.status });
  }
};
