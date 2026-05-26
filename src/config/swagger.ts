import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '2anki Server API',
      version: '2.0.0',
      description:
        'API documentation for 2anki server - Convert content to Anki flashcards',
      contact: {
        name: '2anki',
        url: 'https://github.com/2anki/server',
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === 'production'
            ? 'https://2anki.net/'
            : 'http://localhost:2020',
        description:
          process.env.NODE_ENV === 'production'
            ? 'Production server'
            : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error description',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
            },
          },
        },
        Version: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              description: 'Current API version',
            },
            build: {
              type: 'string',
              description: 'Build information',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
          },
        },
        NotionPage: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              enum: ['page'],
              description: 'Object type',
            },
            id: {
              type: 'string',
              description: 'Page ID',
            },
            created_time: {
              type: 'string',
              format: 'date-time',
              description: 'Page creation timestamp',
            },
            last_edited_time: {
              type: 'string',
              format: 'date-time',
              description: 'Last edited timestamp',
            },
            created_by: {
              $ref: '#/components/schemas/NotionUser',
            },
            last_edited_by: {
              $ref: '#/components/schemas/NotionUser',
            },
            cover: {
              oneOf: [
                { $ref: '#/components/schemas/NotionFile' },
                { type: 'null' },
              ],
            },
            icon: {
              oneOf: [
                { $ref: '#/components/schemas/NotionIcon' },
                { type: 'null' },
              ],
            },
            parent: {
              $ref: '#/components/schemas/NotionParent',
            },
            archived: {
              type: 'boolean',
              description: 'Whether the page is archived',
            },
            properties: {
              type: 'object',
              additionalProperties: true,
              description: 'Page properties',
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Page URL',
            },
            public_url: {
              oneOf: [{ type: 'string', format: 'uri' }, { type: 'null' }],
              description: 'Public page URL',
            },
          },
          required: [
            'object',
            'id',
            'created_time',
            'last_edited_time',
            'created_by',
            'last_edited_by',
            'parent',
            'archived',
            'properties',
            'url',
          ],
        },
        NotionDatabase: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              enum: ['database'],
              description: 'Object type',
            },
            id: {
              type: 'string',
              description: 'Database ID',
            },
            created_time: {
              type: 'string',
              format: 'date-time',
              description: 'Database creation timestamp',
            },
            last_edited_time: {
              type: 'string',
              format: 'date-time',
              description: 'Last edited timestamp',
            },
            created_by: {
              $ref: '#/components/schemas/NotionUser',
            },
            last_edited_by: {
              $ref: '#/components/schemas/NotionUser',
            },
            title: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/NotionRichText',
              },
              description: 'Database title',
            },
            description: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/NotionRichText',
              },
              description: 'Database description',
            },
            icon: {
              oneOf: [
                { $ref: '#/components/schemas/NotionIcon' },
                { type: 'null' },
              ],
            },
            cover: {
              oneOf: [
                { $ref: '#/components/schemas/NotionFile' },
                { type: 'null' },
              ],
            },
            properties: {
              type: 'object',
              additionalProperties: true,
              description: 'Database properties/schema',
            },
            parent: {
              $ref: '#/components/schemas/NotionParent',
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Database URL',
            },
            archived: {
              type: 'boolean',
              description: 'Whether the database is archived',
            },
            is_inline: {
              type: 'boolean',
              description: 'Whether the database is inline',
            },
            public_url: {
              oneOf: [{ type: 'string', format: 'uri' }, { type: 'null' }],
              description: 'Public database URL',
            },
          },
          required: [
            'object',
            'id',
            'created_time',
            'last_edited_time',
            'created_by',
            'last_edited_by',
            'title',
            'description',
            'properties',
            'parent',
            'url',
            'archived',
            'is_inline',
          ],
        },
        NotionUser: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              enum: ['user'],
              description: 'Object type',
            },
            id: {
              type: 'string',
              description: 'User ID',
            },
            type: {
              type: 'string',
              enum: ['person', 'bot'],
              description: 'User type',
            },
            name: {
              type: 'string',
              description: 'User name',
            },
            avatar_url: {
              oneOf: [{ type: 'string', format: 'uri' }, { type: 'null' }],
              description: 'User avatar URL',
            },
          },
          required: ['object', 'id'],
        },
        NotionIcon: {
          type: 'object',
          oneOf: [
            {
              properties: {
                type: { type: 'string', enum: ['emoji'] },
                emoji: { type: 'string' },
              },
              required: ['type', 'emoji'],
            },
            {
              properties: {
                type: { type: 'string', enum: ['external'] },
                external: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                  },
                  required: ['url'],
                },
              },
              required: ['type', 'external'],
            },
            {
              properties: {
                type: { type: 'string', enum: ['file'] },
                file: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    expiry_time: { type: 'string', format: 'date-time' },
                  },
                  required: ['url', 'expiry_time'],
                },
              },
              required: ['type', 'file'],
            },
          ],
        },
        NotionFile: {
          type: 'object',
          oneOf: [
            {
              properties: {
                type: { type: 'string', enum: ['external'] },
                external: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                  },
                  required: ['url'],
                },
              },
              required: ['type', 'external'],
            },
            {
              properties: {
                type: { type: 'string', enum: ['file'] },
                file: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    expiry_time: { type: 'string', format: 'date-time' },
                  },
                  required: ['url', 'expiry_time'],
                },
              },
              required: ['type', 'file'],
            },
          ],
        },
        NotionParent: {
          type: 'object',
          oneOf: [
            {
              properties: {
                type: { type: 'string', enum: ['database_id'] },
                database_id: { type: 'string' },
              },
              required: ['type', 'database_id'],
            },
            {
              properties: {
                type: { type: 'string', enum: ['page_id'] },
                page_id: { type: 'string' },
              },
              required: ['type', 'page_id'],
            },
            {
              properties: {
                type: { type: 'string', enum: ['workspace'] },
                workspace: { type: 'boolean' },
              },
              required: ['type', 'workspace'],
            },
            {
              properties: {
                type: { type: 'string', enum: ['block_id'] },
                block_id: { type: 'string' },
              },
              required: ['type', 'block_id'],
            },
          ],
        },
        NotionRichText: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['text', 'mention', 'equation'],
              description: 'Rich text type',
            },
            text: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                link: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        url: { type: 'string', format: 'uri' },
                      },
                      required: ['url'],
                    },
                    { type: 'null' },
                  ],
                },
              },
            },
            annotations: {
              type: 'object',
              properties: {
                bold: { type: 'boolean' },
                italic: { type: 'boolean' },
                strikethrough: { type: 'boolean' },
                underline: { type: 'boolean' },
                code: { type: 'boolean' },
                color: { type: 'string' },
              },
              required: [
                'bold',
                'italic',
                'strikethrough',
                'underline',
                'code',
                'color',
              ],
            },
            plain_text: {
              type: 'string',
              description: 'Plain text content',
            },
            href: {
              oneOf: [{ type: 'string', format: 'uri' }, { type: 'null' }],
              description: 'Link URL',
            },
          },
          required: ['type', 'plain_text'],
        },
        NotionSearchResults: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              enum: ['list'],
              description: 'Object type',
            },
            results: {
              type: 'array',
              items: {
                oneOf: [
                  { $ref: '#/components/schemas/NotionPage' },
                  { $ref: '#/components/schemas/NotionDatabase' },
                ],
              },
              description: 'Search results',
            },
            next_cursor: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              description: 'Cursor for next page of results',
            },
            has_more: {
              type: 'boolean',
              description: 'Whether there are more results',
            },
            type: {
              type: 'string',
              enum: ['page_or_database'],
              description: 'Type of search results',
            },
            page_or_database: {
              type: 'object',
              description: 'Search metadata',
            },
          },
          required: ['object', 'results', 'has_more', 'type'],
        },
        NotionObject: {
          type: 'object',
          description: 'Simplified Notion object for frontend consumption',
          properties: {
            object: {
              type: 'string',
              description: 'Object type (page or database)',
            },
            title: {
              type: 'string',
              description: 'Object title',
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Object URL',
            },
            icon: {
              type: 'string',
              description: 'Object icon (emoji or URL)',
            },
            id: {
              type: 'string',
              description: 'Object ID',
            },
            data: {
              oneOf: [
                { $ref: '#/components/schemas/NotionPage' },
                { $ref: '#/components/schemas/NotionDatabase' },
              ],
              description: 'Full object data',
            },
            isFavorite: {
              type: 'boolean',
              description: 'Whether the object is favorited',
            },
          },
          required: ['object', 'title', 'url', 'id'],
        },
        Upload: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Upload ID',
            },
            filename: {
              type: 'string',
              description: 'Original filename',
            },
            size: {
              type: 'integer',
              description: 'File size in bytes',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

/**
 * @swagger
 * components:
 *   x-middleware:
 *     authentication:
 *       description: |
 *         All authenticated endpoints require either:
 *         - Bearer token in Authorization header
 *         - Valid session cookie
 *       behaviors:
 *         - Validates JWT tokens
 *         - Checks session cookies
 *         - Returns 401 if invalid/missing
 *     originValidation:
 *       description: |
 *         Public upload endpoints validate request origin
 *       behaviors:
 *         - Checks Origin/Referer headers
 *         - Validates against whitelist
 *         - Returns 403 if not allowed
 *     paidSubscription:
 *       description: |
 *         Premium features require active subscription
 *       behaviors:
 *         - Validates subscription status
 *         - Returns 403 if subscription expired
 */

export const swaggerSpec = swaggerJsdoc(options);

// Custom CSS for swagger UI
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b82f6; }
  `,
  customSiteTitle: '2anki API Documentation',
  customfavIcon: '/favicon.ico',
};
