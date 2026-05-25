import express from 'express';

import { getDatabase } from '../data_layer';
import InactivityEmailRepository from '../data_layer/InactivityEmailRepository';
import ReEngagementRepository from '../data_layer/ReEngagementRepository';
import { TrialEndedEmailRepository } from '../data_layer/TrialEndedEmailRepository';
import { getEventsSink } from '../services/events/eventsSinkInstance';

const ALLOWED_EMAIL_DESTINATIONS = new Set(['/', '/upload', '/pricing', '/login']);

const EmailRedirectRouter = () => {
  const router = express.Router();

  /**
   * @swagger
   * /r/email:
   *   get:
   *     summary: Email click redirect
   *     description: |
   *       Records an `email_clicked` analytics event then 302s the user to a
   *       validated destination. Destination is checked against a static
   *       allowlist (`/`, `/upload`, `/pricing`, `/login`); unknown values fall
   *       back to `/`. Unknown or missing tokens record an anonymous click and
   *       still redirect — never fails user-visibly.
   *     tags: [Email]
   *     parameters:
   *       - in: query
   *         name: t
   *         schema:
   *           type: string
   *         description: Email token from inactivity_emails.token or re_engagement_emails.token
   *       - in: query
   *         name: c
   *         schema:
   *           type: string
   *           enum: [inactivity, reengagement, post_trial]
   *         description: Campaign — disambiguates which table to resolve the token against
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *         description: Destination path (allowlisted); falls back to `/` if unknown
   *     responses:
   *       302:
   *         description: Redirect to the resolved destination
   */
  router.get('/r/email', async (req, res) => {
    const token = typeof req.query.t === 'string' ? req.query.t : null;
    const campaign = typeof req.query.c === 'string' ? req.query.c : null;
    const rawDestination = typeof req.query.to === 'string' ? req.query.to : null;

    const destination = rawDestination != null && ALLOWED_EMAIL_DESTINATIONS.has(rawDestination)
      ? rawDestination
      : '/';

    const domain = process.env.DOMAIN ?? 'https://2anki.net';
    const sink = getEventsSink();

    let userId: number | null = null;
    let emailId: number | null = null;

    if (token != null && campaign != null) {
      const database = getDatabase();

      if (campaign === 'inactivity') {
        const result = await new InactivityEmailRepository(database).findByToken(token).catch(() => null);
        if (result != null) {
          userId = result.userId;
          emailId = result.id;
        }
      } else if (campaign === 'reengagement') {
        const result = await new ReEngagementRepository(database).findByToken(token).catch(() => null);
        if (result != null) {
          userId = result.userId;
          emailId = result.id;
        }
      } else if (campaign === 'post_trial') {
        const result = await new TrialEndedEmailRepository(database).findByToken(token).catch(() => null);
        if (result != null) {
          userId = result.userId;
          emailId = result.id;
        }
      }
    }

    sink.record({
      name: 'email_clicked',
      user_id: userId,
      props: {
        campaign: campaign ?? 'unknown',
        email_id: emailId,
        destination,
      },
    });

    res.redirect(302, `${domain}${destination}`);
  });

  return router;
};

export default EmailRedirectRouter;
