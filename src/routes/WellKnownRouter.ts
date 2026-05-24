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

  return router;
}
