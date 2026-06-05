import { randomUUID } from 'crypto';

import type { Knex } from 'knex';

const VERSIONS_TABLE = 'ost_versions';
const NODES_TABLE = 'opportunity_tree_nodes';

export type NodeType =
  | 'outcome'
  | 'opportunity'
  | 'sub_opportunity'
  | 'solution';

export interface OstNode {
  id: string;
  ostVersionId: string;
  parentId: string | null;
  body: string;
  type: NodeType;
  depth: number;
  sortOrder: number;
}

export interface OstVersion {
  id: string;
  generatedAt: string;
  snapshotCount: number;
  nodes: OstNode[];
}

export interface NewNodeInput {
  id: string;
  parentId: string | null;
  body: string;
  type: NodeType;
  depth: number;
  sortOrder: number;
}

interface VersionRow {
  id: string;
  generated_at: Date | string;
  snapshot_count: number;
}

interface NodeRow {
  id: string;
  ost_version_id: string;
  parent_id: string | null;
  body: string;
  type: string;
  depth: number;
  sort_order: number;
}

function toNode(row: NodeRow): OstNode {
  return {
    id: row.id,
    ostVersionId: row.ost_version_id,
    parentId: row.parent_id,
    body: row.body,
    type: row.type as NodeType,
    depth: row.depth,
    sortOrder: row.sort_order,
  };
}

export class OstRepository {
  constructor(private readonly database: Knex) {}

  async saveVersion(
    snapshotCount: number,
    rawResponse: string,
    nodes: NewNodeInput[]
  ): Promise<OstVersion> {
    const versionId = randomUUID();
    const now = new Date();

    return this.database.transaction(async (trx) => {
      await trx(VERSIONS_TABLE).insert({
        id: versionId,
        generated_at: now,
        snapshot_count: snapshotCount,
        raw_response: rawResponse,
      });

      const savedNodes: OstNode[] = [];
      // Insert parents before children (nodes are sorted by depth ascending in caller)
      for (const node of nodes) {
        await trx(NODES_TABLE).insert({
          id: node.id,
          ost_version_id: versionId,
          parent_id: node.parentId,
          body: node.body,
          type: node.type,
          depth: node.depth,
          sort_order: node.sortOrder,
        });
        savedNodes.push({
          id: node.id,
          ostVersionId: versionId,
          parentId: node.parentId,
          body: node.body,
          type: node.type,
          depth: node.depth,
          sortOrder: node.sortOrder,
        });
      }

      return {
        id: versionId,
        generatedAt: now.toISOString(),
        snapshotCount,
        nodes: savedNodes,
      };
    });
  }

  async getLatest(): Promise<OstVersion | null> {
    const version = await this.database<VersionRow>(VERSIONS_TABLE)
      .orderBy('generated_at', 'desc')
      .first();

    if (version == null) return null;

    const nodeRows = await this.database<NodeRow>(NODES_TABLE)
      .where({ ost_version_id: version.id })
      .orderBy('depth', 'asc')
      .orderBy('sort_order', 'asc');

    return {
      id: version.id,
      generatedAt:
        typeof version.generated_at === 'string'
          ? version.generated_at
          : (version.generated_at as Date).toISOString(),
      snapshotCount: version.snapshot_count,
      nodes: nodeRows.map(toNode),
    };
  }
}
