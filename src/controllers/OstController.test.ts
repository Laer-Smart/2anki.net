import express from 'express';

import { OstController } from './OstController';
import { getAnthropicClient } from '../lib/claude/ClaudeService';
import type { InterviewSnapshot } from '../data_layer/InterviewSnapshotsRepository';

jest.mock('../lib/claude/ClaudeService', () => ({
  getAnthropicClient: jest.fn(),
}));

const SAMPLE_SNAPSHOT: InterviewSnapshot = {
  id: 'snap-1',
  participantName: 'Participant',
  memorableQuote: 'I want fewer clicks',
  photoData: null,
  signupDate: null,
  planTier: 'free',
  usagePattern: 'occasional',
  source: 'fiverr',
  experienceMapData: null,
  interviewDate: '2026-05-22',
  sessionLengthMinutes: 30,
  createdAt: '2026-05-22T12:00:00Z',
  opportunities: [
    { id: 'opp-1', body: 'Wants faster upload', tag: 'opportunity' },
  ],
};

const SAMPLE_TREE = JSON.stringify({
  nodes: [
    {
      id: '1',
      parent_id: null,
      body: 'Successful first-card-review',
      type: 'outcome',
      depth: 0,
      sort_order: 0,
    },
    {
      id: '2',
      parent_id: '1',
      body: 'Upload feels slow',
      type: 'opportunity',
      depth: 1,
      sort_order: 0,
    },
  ],
});

function buildMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as express.Response;
}

describe('OstController.generate', () => {
  let mockCreate: jest.Mock;
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: SAMPLE_TREE }],
      usage: {
        input_tokens: 5,
        output_tokens: 10,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    });
    (getAnthropicClient as jest.Mock).mockReturnValue({
      messages: { create: mockCreate },
    });
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    jest.clearAllMocks();
  });

  function buildController() {
    const snapshotsRepo = {
      list: jest.fn().mockResolvedValue(Array(5).fill(SAMPLE_SNAPSHOT)),
    } as never;
    const ostRepo = {
      saveVersion: jest.fn().mockResolvedValue({ id: 'v-1', nodes: [] }),
      getLatest: jest.fn(),
    } as never;
    return { controller: new OstController(ostRepo, snapshotsRepo), ostRepo };
  }

  it('passes system as an array with a cache_control ephemeral block', async () => {
    const { controller } = buildController();
    await controller.generate({} as express.Request, buildMockResponse());

    const callArg = mockCreate.mock.calls[0][0];
    expect(Array.isArray(callArg.system)).toBe(true);
    expect(callArg.system).toHaveLength(1);
    expect(callArg.system[0]).toMatchObject({
      type: 'text',
      cache_control: { type: 'ephemeral' },
    });
  });

  it('emits a [claude-usage] log line labelled OstController', async () => {
    const { controller } = buildController();
    await controller.generate({} as express.Request, buildMockResponse());

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[claude-usage] label=OstController')
    );
  });

  it('returns 422 when there are fewer than 5 snapshots', async () => {
    const snapshotsRepo = {
      list: jest.fn().mockResolvedValue([SAMPLE_SNAPSHOT]),
    } as never;
    const ostRepo = {
      saveVersion: jest.fn(),
      getLatest: jest.fn(),
    } as never;
    const controller = new OstController(ostRepo, snapshotsRepo);
    const res = buildMockResponse();

    await controller.generate({} as express.Request, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
