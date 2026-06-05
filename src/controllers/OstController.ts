import { randomUUID } from 'crypto';

import express from 'express';

import { getAnthropicClient } from '../lib/claude/ClaudeService';
import { logClaudeUsage } from '../lib/claude/logClaudeUsage';
import type { InterviewSnapshotsRepository } from '../data_layer/InterviewSnapshotsRepository';
import type {
  OstRepository,
  NewNodeInput,
  NodeType,
} from '../data_layer/OstRepository';

const VALID_TYPES = new Set<string>([
  'outcome',
  'opportunity',
  'sub_opportunity',
  'solution',
]);

const MIN_SNAPSHOTS = 5;

const OST_SYSTEM_PROMPT =
  `You are a product discovery analyst using Teresa Torres's Opportunity Solution Tree framework.
Your job: organize customer feedback into a structured tree.

Output ONLY a JSON object — no markdown, no explanation, no code fences:
{"nodes":[{"id":"1","parent_id":null,"body":"...","type":"outcome","depth":0,"sort_order":0}]}

Rules:
- Use sequential string IDs ("1", "2", "3"...)
- Root node: type "outcome", parent_id null, depth 0
- Level 1: type "opportunity", depth 1 — high-level customer needs/pains in their own words
- Level 2: type "sub_opportunity", depth 2 — more specific versions of the parent opportunity
- Level 3: type "solution", depth 3 — concrete ways to address the parent opportunity
- Write opportunity and sub_opportunity bodies in the customer's voice (needs/wants/frustrations, never company perspective)
- Group related feedback under the same opportunity parent
- Aim for 3-6 top-level opportunities; 1-3 sub-opportunities each; 1-2 solutions for the most important ones
- sort_order is the display position among siblings (0-indexed)`.trim();

interface ClaudeNode {
  id: string;
  parent_id: string | null;
  body: string;
  type: string;
  depth: number;
  sort_order: number;
}

interface ClaudeOstResponse {
  nodes: ClaudeNode[];
}

function buildUserMessage(
  snapshots: Awaited<ReturnType<InterviewSnapshotsRepository['list']>>
): string {
  const lines: string[] = [
    'Product outcome to optimize: "Successful first-card-review rate — the user gets a usable Anki deck after their first conversion."',
    '',
    `Customer feedback (${snapshots.length} interview${snapshots.length !== 1 ? 's' : ''}):`,
  ];

  for (const snap of snapshots) {
    lines.push('');
    lines.push(
      `Participant: ${snap.participantName} | Plan: ${snap.planTier || 'unknown'} | Usage: ${snap.usagePattern || 'unknown'}`
    );
    if (snap.memorableQuote) {
      lines.push(`  Quote: "${snap.memorableQuote}"`);
    }
    if (snap.opportunities.length > 0) {
      lines.push('  Opportunities & insights:');
      for (const opp of snap.opportunities) {
        lines.push(`    [${opp.tag}] ${opp.body}`);
      }
    }
  }

  lines.push('');
  lines.push('Now generate the Opportunity Solution Tree JSON.');

  return lines.join('\n');
}

function parseClaudeResponse(raw: string): ClaudeNode[] {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Claude returned invalid JSON for the OST');
  }
  if (
    typeof parsed !== 'object' ||
    parsed == null ||
    !Array.isArray((parsed as ClaudeOstResponse).nodes)
  ) {
    throw new Error('Claude returned unexpected OST structure');
  }
  return (parsed as ClaudeOstResponse).nodes;
}

function mapToNewNodeInputs(claudeNodes: ClaudeNode[]): NewNodeInput[] {
  const idMap = new Map<string, string>();
  // Assign real UUIDs, map sequential IDs
  for (const node of claudeNodes) {
    idMap.set(node.id, randomUUID());
  }

  return claudeNodes
    .filter((n) => VALID_TYPES.has(n.type))
    .sort((a, b) => a.depth - b.depth) // parents before children
    .map((n) => ({
      id: idMap.get(n.id)!,
      parentId: n.parent_id != null ? (idMap.get(n.parent_id) ?? null) : null,
      body: String(n.body).trim().slice(0, 1000),
      type: n.type as NodeType,
      depth: Math.max(0, Math.min(3, Number(n.depth) || 0)),
      sortOrder: Math.max(0, Number(n.sort_order) || 0),
    }));
}

export class OstController {
  constructor(
    private readonly ostRepo: OstRepository,
    private readonly snapshotsRepo: InterviewSnapshotsRepository
  ) {}

  async generate(_req: express.Request, res: express.Response) {
    const snapshots = await this.snapshotsRepo.list();

    if (snapshots.length < MIN_SNAPSHOTS) {
      res.status(422).json({
        message: `Need at least ${MIN_SNAPSHOTS} interview snapshots to generate the tree. Currently have ${snapshots.length}.`,
      });
      return;
    }

    const client = getAnthropicClient();
    const userMessage = buildUserMessage(snapshots);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: OST_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });
    logClaudeUsage('OstController', response.usage);

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => ('text' in b ? b.text : ''))
      .join('');

    const claudeNodes = parseClaudeResponse(raw);
    const nodeInputs = mapToNewNodeInputs(claudeNodes);

    const version = await this.ostRepo.saveVersion(
      snapshots.length,
      raw,
      nodeInputs
    );

    res.status(201).json(version);
  }

  async getLatest(_req: express.Request, res: express.Response) {
    const version = await this.ostRepo.getLatest();
    res.json(version);
  }
}
