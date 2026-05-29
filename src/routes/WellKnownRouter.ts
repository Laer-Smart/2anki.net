import express from 'express';

export default function wellKnownRouter() {
  const router = express.Router();

  router.get(
    '/.well-known/apple-developer-domain-association.txt',
    (_req, res) => {
      const content = process.env.APPLE_DOMAIN_ASSOCIATION;
      if (!content) {
        return res.status(404).send('Not found');
      }
      res.setHeader('Content-Type', 'text/plain');
      res.send(content);
    }
  );

  /**
   * @swagger
   * /.well-known/security.txt:
   *   get:
   *     summary: RFC 9116 security disclosure metadata
   *     description: Plain-text contact and policy details for security researchers.
   *     tags: [WellKnown]
   *     responses:
   *       200:
   *         description: security.txt response
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   */
  router.get('/.well-known/security.txt', (_req, res) => {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const body = [
      'Contact: mailto:support@2anki.net',
      `Expires: ${expires.toISOString()}`,
      'Acknowledgments: https://2anki.net/security',
      'Policy: https://2anki.net/security',
      'Preferred-Languages: en',
      '',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(body);
  });

  return router;
}
