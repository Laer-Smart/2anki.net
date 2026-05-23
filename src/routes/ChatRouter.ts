import express from 'express';
import multer from 'multer';
import ChatController from '../controllers/ChatController';
import ChatConsentController from '../controllers/ChatConsentController';
import ChatDeckController from '../controllers/ChatDeckController';
import ConversationsController from '../controllers/ConversationsController';
import TagCardsController from '../controllers/TagCardsController';
import { ChatUseCase } from '../usecases/chat/ChatUseCase';
import { SetChatConsentUseCase } from '../usecases/chat/SetChatConsentUseCase';
import { ChatDeckUseCase } from '../usecases/chat/ChatDeckUseCase';
import { ConversationsUseCase } from '../usecases/chat/ConversationsUseCase';
import { TagCardsUseCase } from '../usecases/chat/TagCardsUseCase';
import { ChatMessagesRepository } from '../data_layer/ChatMessagesRepository';
import { ConversationsRepository } from '../data_layer/ConversationsRepository';
import UsersRepository from '../data_layer/UsersRepository';
import { getDatabase } from '../data_layer';
import { getAnthropicClient } from '../lib/claude/ClaudeService';
import RequireAuthentication from './middleware/RequireAuthentication';

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

const ChatRouter = () => {
  const router = express.Router();
  const db = getDatabase();
  const messagesRepo = new ChatMessagesRepository(db);
  const conversationsRepo = new ConversationsRepository(db);
  const usersRepo = new UsersRepository(db);
  const anthropic = getAnthropicClient();
  const useCase = new ChatUseCase(messagesRepo, conversationsRepo, anthropic);
  const controller = new ChatController(useCase);
  const consentUseCase = new SetChatConsentUseCase(usersRepo);
  const consentController = new ChatConsentController(consentUseCase);
  const deckUseCase = new ChatDeckUseCase();
  const deckController = new ChatDeckController(deckUseCase);
  const tagCardsUseCase = new TagCardsUseCase(anthropic, messagesRepo);
  const tagCardsController = new TagCardsController(tagCardsUseCase);
  const conversationsUseCase = new ConversationsUseCase(conversationsRepo);
  const conversationsController = new ConversationsController(conversationsUseCase);

  /**
   * @swagger
   * /api/chat/consent:
   *   post:
   *     summary: Record chat consent for the authenticated user
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       204:
   *         description: Consent recorded
   */
  router.post('/api/chat/consent', RequireAuthentication, (req, res) =>
    consentController.recordConsent(req, res)
  );

  /**
   * @swagger
   * /api/chat/message:
   *   post:
   *     summary: Send a message to the study assistant
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [content]
   *             properties:
   *               content:
   *                 type: string
   *                 maxLength: 100000
   *               conversationId:
   *                 type: integer
   *                 nullable: true
   *               history:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [role, content]
   *                   properties:
   *                     role:
   *                       type: string
   *                       enum: [user, assistant]
   *                     content:
   *                       type: string
   *     responses:
   *       200:
   *         description: Assistant reply
   *       400:
   *         description: Invalid content
   *       429:
   *         description: Monthly message limit reached
   */
  router.post(
    '/api/chat/message',
    RequireAuthentication,
    chatUpload.array('files', 5),
    (req, res) => controller.sendMessage(req, res)
  );

  /**
   * @swagger
   * /api/chat/deck:
   *   post:
   *     summary: Generate an Anki deck from chat cards
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cards, deckName]
   *             properties:
   *               deckName:
   *                 type: string
   *                 maxLength: 120
   *               cards:
   *                 type: array
   *                 maxItems: 200
   *                 items:
   *                   type: object
   *                   required: [front, back]
   *                   properties:
   *                     front:
   *                       type: string
   *                     back:
   *                       type: string
   *     responses:
   *       200:
   *         description: Anki .apkg file
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       400:
   *         description: Invalid input
   */
  router.post('/api/chat/deck', RequireAuthentication, (req, res) =>
    deckController.generate(req, res)
  );

  /**
   * @swagger
   * /api/chat/tag-cards:
   *   post:
   *     summary: Generate short subject tags for an existing set of chat cards
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cards]
   *             properties:
   *               cards:
   *                 type: array
   *                 maxItems: 200
   *                 items:
   *                   type: object
   *                   required: [front]
   *                   properties:
   *                     front: { type: string }
   *                     back: { type: string }
   *     responses:
   *       200:
   *         description: Tags per card, parallel to the input array
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tags:
   *                   type: array
   *                   items:
   *                     type: array
   *                     items: { type: string }
   *       400:
   *         description: Invalid input
   */
  router.post('/api/chat/tag-cards', RequireAuthentication, (req, res) =>
    tagCardsController.tag(req, res)
  );

  /**
   * @swagger
   * /api/chat/usage:
   *   get:
   *     summary: Get chat usage for the current month
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Usage data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 used:
   *                   type: integer
   *                 limit:
   *                   type: integer
   *                   nullable: true
   */
  router.get('/api/chat/usage', RequireAuthentication, async (req, res) => {
    const owner = res.locals.owner as number;
    const patreon = (res.locals.patreon as boolean) ?? false;
    const subscriber = (res.locals.subscriber as boolean) ?? false;
    const count = await messagesRepo.countThisMonth(owner);
    res.status(200).json({
      used: count,
      limit: patreon || subscriber ? null : 20,
    });
  });

  /**
   * @swagger
   * /api/chat/conversations:
   *   get:
   *     summary: List the user's chat conversations
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Conversation summaries, newest first
   */
  router.get('/api/chat/conversations', RequireAuthentication, (req, res) =>
    conversationsController.list(req, res)
  );

  /**
   * @swagger
   * /api/chat/conversations/{id}:
   *   get:
   *     summary: Load a conversation and its messages
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Conversation with messages
   *       404:
   *         description: Conversation not found
   *   patch:
   *     summary: Rename a conversation
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title]
   *             properties:
   *               title:
   *                 type: string
   *                 maxLength: 120
   *     responses:
   *       204:
   *         description: Renamed
   *       400:
   *         description: Invalid title
   *       404:
   *         description: Conversation not found
   *   delete:
   *     summary: Soft-delete a conversation
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       204:
   *         description: Deleted
   *       404:
   *         description: Conversation not found
   */
  router.get('/api/chat/conversations/:id', RequireAuthentication, (req, res) =>
    conversationsController.get(req, res)
  );
  router.patch('/api/chat/conversations/:id', RequireAuthentication, (req, res) =>
    conversationsController.rename(req, res)
  );
  router.delete('/api/chat/conversations/:id', RequireAuthentication, (req, res) =>
    conversationsController.delete(req, res)
  );

  /**
   * @swagger
   * /api/chat/conversations/{id}/draft:
   *   patch:
   *     summary: Save the in-progress draft for a conversation
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [content]
   *             properties:
   *               content:
   *                 type: string
   *                 nullable: true
   *                 maxLength: 100000
   *     responses:
   *       204:
   *         description: Draft saved (or cleared if content is null)
   *       400:
   *         description: Invalid input
   *       404:
   *         description: Conversation not found
   */
  router.patch('/api/chat/conversations/:id/draft', RequireAuthentication, (req, res) =>
    conversationsController.saveDraft(req, res)
  );

  /**
   * @swagger
   * /api/chat/conversations/{id}/template:
   *   patch:
   *     summary: Set the card template for a conversation
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [templateSlug]
   *             properties:
   *               templateSlug:
   *                 type: string
   *                 nullable: true
   *                 enum: [basic, basic-and-reversed, cloze]
   *     responses:
   *       204:
   *         description: Template saved
   *       400:
   *         description: Invalid input
   *       404:
   *         description: Conversation not found
   */
  router.patch('/api/chat/conversations/:id/template', RequireAuthentication, (req, res) =>
    conversationsController.saveTemplate(req, res)
  );

  return router;
};

export default ChatRouter;
