import { convertDocxToHTML } from './convertDocxToHTML';

describe('convertDocxToHTML', () => {
  it('rejects with docx_parse_failed: prefix when given a raw PDF buffer', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content that is not a docx');
    await expect(convertDocxToHTML(pdfBuffer)).rejects.toThrow(/^docx_parse_failed: /);
  });

  it('rejects with docx_parse_failed: prefix when given a random binary buffer', async () => {
    const randomBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);
    await expect(convertDocxToHTML(randomBuffer)).rejects.toThrow(/^docx_parse_failed: /);
  });
});
