import {
  buildAttachmentBlocks,
  type ChatAttachment,
} from './buildAttachmentBlocks';

const PDF_MIME = 'application/pdf';
const PNG_MIME = 'image/png';
const JPEG_MIME = 'image/jpeg';
const WEBP_MIME = 'image/webp';
const GIF_MIME = 'image/gif';

function makeAttachment(mimeType: string, dataLength = 16): ChatAttachment {
  return {
    mimeType,
    data: Buffer.alloc(dataLength, 0xab),
  };
}

describe('buildAttachmentBlocks', () => {
  it('returns an image block for image/png', () => {
    const result = buildAttachmentBlocks([makeAttachment(PNG_MIME)]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: PNG_MIME },
    });
  });

  it('returns an image block for image/jpeg', () => {
    const result = buildAttachmentBlocks([makeAttachment(JPEG_MIME)]);
    expect(result[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: JPEG_MIME },
    });
  });

  it('returns an image block for image/webp', () => {
    const result = buildAttachmentBlocks([makeAttachment(WEBP_MIME)]);
    expect(result[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: WEBP_MIME },
    });
  });

  it('returns an image block for image/gif', () => {
    const result = buildAttachmentBlocks([makeAttachment(GIF_MIME)]);
    expect(result[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: GIF_MIME },
    });
  });

  it('returns a document block for application/pdf', () => {
    const result = buildAttachmentBlocks([makeAttachment(PDF_MIME)]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'document',
      source: { type: 'base64', media_type: PDF_MIME },
    });
  });

  it('base64-encodes the buffer', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    const result = buildAttachmentBlocks([{ mimeType: PDF_MIME, data: buf }]);
    const expected = buf.toString('base64');
    expect((result[0] as { source: { data: string } }).source.data).toBe(
      expected
    );
  });

  it('returns multiple blocks preserving order', () => {
    const attachments = [
      makeAttachment(PNG_MIME),
      makeAttachment(PDF_MIME),
      makeAttachment(JPEG_MIME),
    ];
    const result = buildAttachmentBlocks(attachments);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('image');
    expect(result[1].type).toBe('document');
    expect(result[2].type).toBe('image');
  });

  it('returns empty array for empty input', () => {
    expect(buildAttachmentBlocks([])).toEqual([]);
  });
});
