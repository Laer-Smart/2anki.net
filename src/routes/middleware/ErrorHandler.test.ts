import express from 'express';
import multer from 'multer';

import ErrorHandler from './ErrorHandler';
import { PythonExitError } from '../../lib/anki/buildPythonExitError';

const makeRequest = (): express.Request =>
  ({
    body: {},
    path: '/api/sample',
    method: 'POST',
    query: {},
    files: [],
  } as unknown as express.Request);

interface FakeResponse {
  headersSent: boolean;
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  set: jest.Mock;
  status: jest.Mock;
  send: jest.Mock;
  json: jest.Mock;
}

const makeResponse = (headersSent: boolean): FakeResponse => {
  const state: FakeResponse = {
    headersSent,
    statusCode: 200,
    headers: {},
    body: undefined,
  } as FakeResponse;

  state.set = jest.fn((name: string, value: string) => {
    if (state.headersSent) {
      throw Object.assign(
        new Error('Cannot set headers after they are sent to the client'),
        { code: 'ERR_HTTP_HEADERS_SENT' }
      );
    }
    state.headers[name] = value;
    return state;
  });

  state.status = jest.fn((code: number) => {
    if (state.headersSent) {
      throw Object.assign(
        new Error('Cannot set headers after they are sent to the client'),
        { code: 'ERR_HTTP_HEADERS_SENT' }
      );
    }
    state.statusCode = code;
    return state;
  });

  state.send = jest.fn((body: unknown) => {
    state.body = body;
    state.headersSent = true;
    return state;
  });

  state.json = jest.fn((body: unknown) => {
    state.body = body;
    state.headersSent = true;
    return state;
  });

  return state;
};

describe('ErrorHandler', () => {
  test('emits JSON with code=unknown and message for a plain error', async () => {
    const res = makeResponse(false);
    const req = makeRequest();

    await ErrorHandler(
      res as unknown as express.Response,
      req,
      new Error('something failed')
    );

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'unknown', message: 'something failed' })
    );
  });

  test('emits code=invalid_markup for a PythonExitError with kind invalid-markup', async () => {
    const res = makeResponse(false);
    const req = makeRequest();

    const err = new PythonExitError('markup error', {
      kind: 'invalid-markup',
      rawOutput: 'UserWarning: ...',
      code: 1,
    });

    await ErrorHandler(res as unknown as express.Response, req, err);

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_markup', message: 'markup error' })
    );
  });

  test('emits code=too_large for a PythonExitError with kind too-large', async () => {
    const res = makeResponse(false);
    const req = makeRequest();

    const err = new PythonExitError('too large', {
      kind: 'too-large',
      rawOutput: 'MemoryError',
      code: null,
    });

    await ErrorHandler(res as unknown as express.Response, req, err);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'too_large' })
    );
  });

  test('emits code=malformed_notion for a PythonExitError with kind unsupported-data-source', async () => {
    const res = makeResponse(false);
    const req = makeRequest();

    const err = new PythonExitError('notion error', {
      kind: 'unsupported-data-source',
      rawOutput: "Unsupported 'data_source'!",
      code: 1,
    });

    await ErrorHandler(res as unknown as express.Response, req, err);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'malformed_notion' })
    );
  });

  test('emits code=too_large for multer LIMIT_FILE_SIZE', async () => {
    const res = makeResponse(false);
    const req = makeRequest();

    const err = new multer.MulterError('LIMIT_FILE_SIZE');

    await ErrorHandler(res as unknown as express.Response, req, err);

    expect(res.statusCode).toBe(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'too_large',
        message: expect.stringContaining('50 MB'),
      })
    );
  });

  test('emits code=unsupported_format for multer LIMIT_UNEXPECTED_FILE', async () => {
    const res = makeResponse(false);
    const req = makeRequest();

    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');

    await ErrorHandler(res as unknown as express.Response, req, err);

    expect(res.statusCode).toBe(415);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'unsupported_format',
        message: expect.stringContaining('.zip'),
      })
    );
  });

  test('emits code=unknown with multer message for other MulterErrors', async () => {
    const res = makeResponse(false);
    const req = makeRequest();

    const err = new multer.MulterError('LIMIT_PART_COUNT');

    await ErrorHandler(res as unknown as express.Response, req, err);

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'unknown' })
    );
  });

  test('does not throw when headers have already been sent', async () => {
    const res = makeResponse(true);
    const req = makeRequest();

    await expect(
      ErrorHandler(
        res as unknown as express.Response,
        req,
        new Error('late failure')
      )
    ).resolves.toBeUndefined();

    expect(res.set).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
