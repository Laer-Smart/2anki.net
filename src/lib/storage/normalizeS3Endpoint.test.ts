import { normalizeS3Endpoint } from './normalizeS3Endpoint';

describe('normalizeS3Endpoint', () => {
  it.each([
    ['fra1.digitaloceanspaces.com', 'https://fra1.digitaloceanspaces.com'],
    [
      'https://fra1.digitaloceanspaces.com',
      'https://fra1.digitaloceanspaces.com',
    ],
    ['http://localhost:9000', 'http://localhost:9000'],
    ['nyc3.digitaloceanspaces.com', 'https://nyc3.digitaloceanspaces.com'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizeS3Endpoint(input)).toBe(expected);
  });

  it.each([
    [undefined, 'SPACES_ENDPOINT is required'],
    ['', 'SPACES_ENDPOINT is required'],
  ])('throws when env is %p', (input, message) => {
    expect(() => normalizeS3Endpoint(input)).toThrow(message);
  });
});
