import { getSecret } from '../../secrets.js';

export async function createIssue(req, res) {
  const { repo, title, body, labels } = req.body;
  if (!repo || !title) {
    return res.status(400).json({ error: 'Missing repo or title in request body' });
  }

  const token = getSecret('GITHUB_TOKEN');
  if (!token) return res.status(401).json({ error: 'GITHUB_TOKEN not found in .env' });

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Censai-App'
      },
      body: JSON.stringify({
        title,
        body: body || '',
        labels: labels || []
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const result = await response.json();
    res.json({ ok: true, issueNumber: result.number, url: result.html_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
