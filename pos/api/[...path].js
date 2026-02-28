const BACKEND_URL = 'https://project3-production-4ea8.up.railway.app';

export default async function handler(req, res) {
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : path;
  const targetUrl = `${BACKEND_URL}/api/${targetPath}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['origin'];
  delete headers['referer'];
  headers['host'] = new URL(BACKEND_URL).host;

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Forward response headers
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'content-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);
    const text = await response.text();
    res.send(text);
  } catch (error) {
    res.status(502).json({ success: false, message: 'Backend unavailable' });
  }
}
