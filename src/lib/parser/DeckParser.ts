import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

import preserveNewlinesIfApplicable from '../../services/NotionService/helpers/preserveNewlinesIfApplicable';
import sanitizeTags from '../anki/sanitizeTags';
import { File } from '../zip/zip';
import Deck from './Deck';
import Note from './Note';
import CardOption from './Settings';
import Workspace from './WorkSpace';
import CustomExporter from './exporters/CustomExporter';
import handleClozeDeletions from './helpers/handleClozeDeletions';
import {
  extractHeadingFromSummary,
  extractHeadingMarkup,
} from './helpers/extractHeadingFromSummary';
import replaceAll from './helpers/replaceAll';

import get16DigitRandomId from '../../shared/helpers/get16DigitRandomId';
import { isValidAudioFile } from '../anki/format';
import FallbackParser from './experimental/FallbackParser';
import { embedFile } from './exporters/embedFile';
import { resolveNotionS3ImageFromZip } from './exporters/resolveNotionS3ImageFromZip';
import getYouTubeEmbedLink from './helpers/getYouTubeEmbedLink';
import getYouTubeID from './helpers/getYouTubeID';
import { isFileNameEqual } from '../storage/types';
import {
  isHTMLFile,
  isImageFileEmbedable,
  isMarkdownFile,
} from '../storage/checks';
import { getFileContents } from './getFileContents';
import { handleNestedBulletPointsInMarkdown } from './handleNestedBulletPointsInMarkdown';
import { guessMarkdownCards, MarkdownHeuristicResult } from './guessMarkdownCards';
import { getTitleFromMarkdown } from './getTitleFromMarkdown';
import { extractStyles } from './extractStyles';
import { withFontSize } from './withFontSize';
import { NOTION_STYLE } from '../../templates/helper';
import { transformDetailsTagToNotionToggleList } from './transformDetailsTagToNotionToggleList';
import { findNotionToggleLists, isMCQ } from './findNotionToggleLists';
import { EmptyDeckError } from '../../usecases/jobs/EmptyDeckError';
import { extractName } from '../extractDeckName';

const MARKDOWN_SOURCE_RATIO_THRESHOLD = 0.8;

function isMarkdownSourcedFiles(files: File[]): boolean {
  const contentFiles = files.filter(
    (f) => isMarkdownFile(f.name) || isHTMLFile(f.name)
  );
  if (contentFiles.length === 0) return false;
  const mdCount = contentFiles.filter((f) => isMarkdownFile(f.name)).length;
  return mdCount / contentFiles.length >= MARKDOWN_SOURCE_RATIO_THRESHOLD;
}

export interface DeckParserInput {
  name: string;
  settings: CardOption;
  files: File[];
  noLimits: boolean;
  workspace: Workspace;
  onProgress?: (step: string) => void;
  pdfCredential?: string;
}

function hasNestedBullets(content: string | undefined): boolean {
  if (content == null || content === '') return false;
  return /^[ \t]+[-*+][ \t]/m.test(content);
}

export class DeckParser {
  firstDeckName: string;

  settings: CardOption;

  payload: Deck[];

  files: File[];

  noLimits: boolean;

  usedHeuristic: boolean;

  workspace: Workspace;
  customExporter: CustomExporter;

  public get name() {
    return this.payload[0]?.name ?? this.firstDeckName;
  }

  constructor(input: DeckParserInput) {
    this.settings = input.settings;
    this.files = input.files || [];
    this.firstDeckName = input.name;
    this.noLimits = input.noLimits;
    this.usedHeuristic = false;
    this.payload = [];
    this.workspace = input.workspace ?? new Workspace(true, 'fs');
    this.customExporter = new CustomExporter(
      input.name,
      this.workspace.location
    );
    this.processFirstFile(input.name);
  }

  processFirstFile(name: string) {
    const firstFile = this.files.find((file) => isFileNameEqual(file, name));

    if (isMarkdownFile(name)) {
      const contents = getFileContents(firstFile, false);
      const contentsStr = contents?.toString();
      if (this.settings.nestedBulletPoints || hasNestedBullets(contentsStr)) {
        this.payload = handleNestedBulletPointsInMarkdown({
          name,
          contents: contentsStr,
          deckName: this.settings.deckName,
          decks: [],
          settings: this.settings,
          exporter: this.customExporter,
          workspace: this.workspace,
          files: this.files,
        });
      }
      if (this.payload.every((d) => d.cards.length === 0)) {
        const heuristic = guessMarkdownCards(contentsStr ?? '');
        if (heuristic) {
          this.applyHeuristic(heuristic, contentsStr, name);
        }
      }
    } else if (isHTMLFile(name)) {
      const contents = getFileContents(firstFile, true);
      this.payload = contents
        ? this.handleHTML(
            name,
            contents.toString(),
            this.settings.deckName || '',
            []
          )
        : [];
    } else {
      this.payload = [];
    }
  }

  findNextPage(href: string | undefined): string | Uint8Array | undefined {
    if (!href) {
      console.debug(`skipping next page, due to href being ${href}`);
      return undefined;
    }
    const next = global.decodeURIComponent(href);
    const nextFile = this.files.find((file) =>
      file.name.match(next.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&'))
    );
    return nextFile?.contents?.toString();
  }

  noteHasCherry(note: Note) {
    const cherry = '&#x1F352;';
    return (
      note.name.includes(cherry) ||
      note.back.includes(cherry) ||
      note.name.includes('🍒') ||
      note.back.includes('🍒')
    );
  }

  noteHasAvocado(note: Note) {
    const avocado = '&#x1F951';
    return note.name.includes(avocado) || note.name.includes('🥑');
  }

  findIndentedToggleLists(dom: cheerio.CheerioAPI): Element[] {
    const selector = '.page-body > details';
    return dom(selector).toArray();
  }

  removeNestedTogglesLegacy(input: string): string {
    return input
      .replace(/<details[^>]*>([\s\S]*?)<\/details>/g, (_match, inner) =>
        extractHeadingFromSummary(inner)
      )
      .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/g, (_match, inner) =>
        extractHeadingMarkup(inner)
      )
      .replace(/<li><\/li>/g, '')
      .replace(/<ul[^/>][^>]*><\/ul>/g, '')
      .replace(/<\/details><\/li><\/ul><\/details><\/li><\/ul>/g, '')
      .replace(/<\/details><\/li><\/ul>/g, '')
      .replaceAll('<summary class="toggle"></summary>', '');
  }

  removeNestedTogglesNewFormat(input: string): string {
    const result = this.cleanupEmptyElements(input, true);
    return result.trim();
  }

  private applyHeuristic(heuristic: MarkdownHeuristicResult, contentsStr: string | undefined, name: string) {
    for (const note of heuristic.notes) {
      if (this.settings.embedImages) {
        const { html: newName, media: namMedia } = this.embedImagesInHtml(note.name);
        const { html: newBack, media: backMedia } = this.embedImagesInHtml(note.back);
        note.name = newName;
        note.back = newBack;
        note.media = [...namMedia, ...backMedia];
      } else {
        note.media = [];
      }
    }
    const deck = new Deck(
      this.settings.deckName ?? getTitleFromMarkdown(contentsStr) ?? name,
      heuristic.notes,
      '',
      '',
      get16DigitRandomId(),
      this.settings
    );
    this.payload = [deck];
    this.usedHeuristic = true;
  }

  private embedImagesInHtml(html: string): { html: string; media: string[] } {
    // Fragment mode (isDocument=false). xmlMode would double-escape `&nbsp;`
    // (and other named HTML entities) because xmlMode treats them as
    // undefined-in-XML and re-escapes the `&`, producing visible `&nbsp;`
    // text in the user's card. Default doc mode would wrap output in
    // <html><body>...
    const dom = cheerio.load(html, null, false);
    const media: string[] = [];
    dom('img').each((_i, elem) => {
      const src = dom(elem).attr('src');
      if (!src) return;

      if (isImageFileEmbedable(src)) {
        const newName = embedFile({
          exporter: this.customExporter,
          files: this.files,
          filePath: decodeURIComponent(src),
          workspace: this.workspace,
        });
        if (newName) {
          dom(elem).attr('src', newName);
          media.push(newName);
        }
        return;
      }

      const zipFile = resolveNotionS3ImageFromZip(src, this.files);
      if (zipFile) {
        const newName = embedFile({
          exporter: this.customExporter,
          files: this.files,
          filePath: zipFile.name,
          workspace: this.workspace,
        });
        if (newName) {
          dom(elem).attr('src', newName);
          media.push(newName);
        }
      }
    });
    return { html: dom.html() ?? html, media };
  }

  private preserveSummaryContent(html: string): string {
    // Always remove summary tags, but preserve their content
    return html.replace(/<summary[^>]*>(.*?)<\/summary>/g, '$1');
  }

  private removeToggleStructureTags(html: string): string {
    return html
      .replace(/<details[^>]*>/g, '')
      .replace(/<\/details>/g, '')
      .replace(/<ul[^/>][^>]*>/g, '')
      .replace(/<\/ul>/g, '')
      .replace(/<\/li>/g, '')
      .replace(/<li[^>]*>/g, '');
  }

  private cleanupEmptyElements(html: string, isNewFormat: boolean = false): string {
    let result = html
      .replace(/<li><\/li>/g, '');

    if (isNewFormat) {
      result = result.replace(/<summary[^>]*class="toggle"[^>]*><\/summary>/g, '');
      result = result.replace(/<summary[^>]*><\/summary>/g, '');
      result = result.replaceAll('<summary class="toggle"></summary>', '');
    } else {
      result = result.replaceAll('<summary class="toggle"></summary>', '');
    }

    return result;
  }

  getLink(pageId: string | undefined, note: Note): string | null {
    try {
      const page = pageId!.replace(/-/g, '');
      const link = `https://www.notion.so/${page}#${note.notionId}`;
      return `
                <a
                style="text-decoration: none; color: grey;"
                href="${link}">
                  Open in Notion
                </a>
                `;
    } catch (error) {
      console.info('experienced error while getting link');
      console.error(error);
      return null;
    }
  }

  // Avoids a full cheerio.load on the whole document. Paired with loadDOM,
  // a DOM-based normalisation here meant the entire HTML was materialised as a
  // cheerio tree twice in a row, which OOM'd 30–40 MB Notion exports.
  removeNewlinesInSVGPathAttributeD(html: string): string {
    return html.replace(
      /<path\b([^>]*?)\sd=(["'])([\s\S]*?)\2/gi,
      (_match, prefix, quote, value) =>
        `<path${prefix} d=${quote}${value.replace(/\n/g, '').trim()}${quote}`
    );
  }

  getFirstHeadingText(dom: cheerio.CheerioAPI) {
    try {
      const firstHeading = dom('h1').first();
      return firstHeading.text();
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  handleHTML(
    fileName: string,
    contents: string,
    deckName: string,
    decks: Deck[]
  ) {
    const { dom, isNewFormat } = this.loadAndNormalizeDOM(contents);

    const extractedStyle = extractStyles(dom);
    const style = withFontSize(
      extractedStyle ? `${NOTION_STYLE}\n${extractedStyle}` : NOTION_STYLE,
      this.settings.fontSize
    );
    let image: string | undefined = this.extractCoverImage(dom);

    const name = extractName({
      name:
        deckName ||
        dom('title').text() ||
        this.getFirstHeadingText(dom) ||
        fileName ||
        'Default',
      pageIcon: this.extractPageIcon(dom),
      decksCount: decks.length,
      settings: this.settings,
    });

    const fileGlobalTags = this.extractGlobalTags(dom);

    const toggleList = this.extractToggleLists(dom);
    const paragraphs = this.extractCardsFromParagraph(dom);
    const extractResult = this.extractCards(dom, toggleList, isNewFormat);
    let cards: Note[] = extractResult.cards;

    const disableIndentedBullets = this.settings.disableIndentedBulletPoints;
    if (cards.length === 0) {
      cards.push(
        ...[
          ...this.extractCardsFromLists(dom, disableIndentedBullets),
          ...paragraphs,
        ]
      );
    } else if (this.settings.disableIndentedBulletPoints) {
      cards.push(
        ...[...this.extractCardsFromLists(dom, disableIndentedBullets)]
      );
    }

    cards = cards.filter(Boolean);

    const deck = new Deck(name, cards, image, style, get16DigitRandomId(), this.settings);
    deck.globalTags = fileGlobalTags;
    deck.mcqCount = extractResult.mcqCount;
    deck.mcqSkippedCount = extractResult.mcqSkippedCount;
    decks.push(deck);

    const subpages = dom('.link-to-page').toArray();
    for (const page of subpages) {
      const spDom = dom(page);
      const ref = spDom.find('a').first();
      const href = ref.attr('href');
      const pageContent = this.findNextPage(href);
      if (pageContent && name) {
        const subDeckName = spDom.find('title').text() || ref.text();
        this.handleHTML(
          fileName,
          pageContent.toString(),
          `${name}::${subDeckName}`,
          decks
        );
      }
    }
    return decks;
  }

  private extractGlobalTags(dom: cheerio.CheerioAPI): string[] {
    const tags: string[] = [];
    dom('.page-body > p > del').each((_i: number, elem: Element) => {
      tags.push(...sanitizeTags(dom(elem).text().split(',')));
    });
    return tags;
  }

  // https://stackoverflow.com/questions/6903823/regex-for-youtube-id
  _getYouTubeID(input: string) {
    return this.ensureNotNull(input, () => {
      try {
        return getYouTubeID(input);
      } catch (error) {
        console.debug('error in getYouTubeID');
        console.error(error);
        return null;
      }
    });
  }

  ensureNotNull(input: string, cb: () => void) {
    if (!input || !input.trim()) {
      return null;
    }
    return cb();
  }

  getSoundCloudURL(input: string) {
    return this.ensureNotNull(input, () => {
      try {
        const sre = /https?:\/\/soundcloud\.com\/\S*/gi;
        const m = input.match(sre);
        if (!m || m.length === 0) {
          return null;
        }
        return m[0].split('">')[0];
      } catch (error) {
        console.debug('error in getSoundCloudURL');
        console.error(error);
        return null;
      }
    });
  }

  getMP3File(input: string) {
    return this.ensureNotNull(input, () => {
      try {
        const m = input.match(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/i);
        if (!m || m.length < 3) {
          return null;
        }
        const ma = m[2];
        if (!isValidAudioFile(ma) || ma.startsWith('http')) {
          return null;
        }
        return ma;
      } catch (error) {
        console.error(error);
        return null;
      }
    });
  }

  treatBoldAsInput(input: string, inline: boolean) {
    const dom = cheerio.load(input);
    const underlines = dom('strong');
    let mangle = input;
    let answer = '';
    underlines.each((_i, elem) => {
      const v = dom(elem).html();
      if (v) {
        const old = `<strong>${v}</strong>`;
        mangle = replaceAll(mangle, old, inline ? v : '{{type:Input}}');
        answer = v;
      }
    });
    return { mangle, answer };
  }

  locateTags(card: Note, deckGlobalTags: string[]) {
    const input = [card.name, card.back];

    if (!card.tags) {
      card.tags = [];
    }

    for (const i of input) {
      if (!i) {
        continue;
      }

      const dom = cheerio.load(i);
      const deletionsDOM = dom('del');
      deletionsDOM.each((_i: number, elem: Element) => {
        const del = dom(elem);
        card.tags.push(...sanitizeTags(del.text().split(',')));
        card.back = replaceAll(card.back, `<del>${del.html()}</del>`, '');
        card.name = replaceAll(card.name, `<del>${del.html()}</del>`, '');
      });
    }

    card.tags.push(...deckGlobalTags);
    return card;
  }

  private embedImagesInCardContent(content: string, card: Note, ws: Workspace): string {
    const dom = cheerio.load(content);
    const images = dom('img');
    if (images.length === 0) return content;

    images.each((_i, elem) => {
      const originalName = dom(elem).attr('src');
      if (!originalName) return;

      if (isImageFileEmbedable(originalName)) {
        const decodedPath = decodeURIComponent(originalName);
        const newName = embedFile({
          exporter: this.customExporter,
          files: this.files,
          filePath: decodedPath,
          workspace: ws,
        });
        if (newName) {
          dom(elem).attr('src', newName);
          card.media.push(newName);
        } else {
          dom(elem).attr('src', decodedPath.split('/').pop() ?? originalName);
        }
        return;
      }

      const zipFile = resolveNotionS3ImageFromZip(originalName, this.files);
      if (zipFile) {
        const newName = embedFile({
          exporter: this.customExporter,
          files: this.files,
          filePath: zipFile.name,
          workspace: ws,
        });
        if (newName) {
          dom(elem).attr('src', newName);
          card.media.push(newName);
        }
      }
    });
    return dom.html();
  }

  private embedCardImages(card: Note, ws: Workspace) {
    if (!this.settings.embedImages) {
      return;
    }
    if (card.name) {
      card.name = this.embedImagesInCardContent(card.name, card, ws);
    }
    if (card.back) {
      card.back = this.embedImagesInCardContent(card.back, card, ws);
    }
  }

  private embedCardAudio(card: Note, ws: Workspace) {
    const audiofile = this.getMP3File(card.back);
    if (!audiofile) return;

    if (this.settings.removeMP3Links) {
      card.back = card.back.replace(
        /<figure.*<a\shref=["'].*\.mp3["']>.*<\/a>.*<\/figure>/,
        ''
      );
    }
    const newFileName = embedFile({
      exporter: this.customExporter,
      files: this.files,
      filePath: global.decodeURIComponent(audiofile),
      workspace: ws,
    });
    if (newFileName) {
      card.back += `[sound:${newFileName}]`;
      card.media.push(newFileName);
    }
  }

  private appendCardVideoEmbeds(card: Note) {
    const id = this._getYouTubeID(card.back);
    if (id) {
      const ytSrc = getYouTubeEmbedLink(id);
      card.back += `<iframe width='560' height='315' src='${ytSrc}' frameborder='0' allowfullscreen></iframe>`;
    }

    const soundCloudUrl = this.getSoundCloudURL(card.back);
    if (soundCloudUrl) {
      card.back += `<iframe width='100%' height='166' scrolling='no' frameborder='no' src='https://w.soundcloud.com/player/?url=${soundCloudUrl}'></iframe>`;
    }
  }

  private transformCard(card: Note, counter: number, ws: Workspace) {
    card.number = counter;

    if (card.mcq) {
      card.media = [];
      if (!card.tags) {
        card.tags = [];
      }
      return;
    }

    card.enableInput = this.settings.useInput;
    card.cloze = this.settings.isCloze;

    if (card.cloze) {
      card.name = handleClozeDeletions(card.name);
    }

    if (this.settings.useInput && card.name.includes('<strong>')) {
      const inputInfo = this.treatBoldAsInput(card.name, false);
      card.name = inputInfo.mangle;
      card.answer = inputInfo.answer;
    }

    card.media = [];
    this.embedCardImages(card, ws);
    this.embedCardAudio(card, ws);
    this.appendCardVideoEmbeds(card);

    if (this.settings.useInput && card.back.includes('<strong>')) {
      const inputInfo = this.treatBoldAsInput(card.back, true);
      card.back = inputInfo.mangle;
    }

    if (!card.tags) {
      card.tags = [];
    }
  }

  private processPayload(ws: Workspace) {
    for (const d of this.payload) {
      const deck = d;
      deck.id = get16DigitRandomId();

      let counter = 0;
      const addThese: Note[] = [];
      for (const c of deck.cards) {
        let card = c;
        this.transformCard(card, counter++, ws);

        if (this.settings.useTags) {
          card = this.locateTags(card, deck.globalTags);
        }

        if (this.settings.basicReversed) {
          const note = new Note(card.back, card.name);
          note.tags = card.tags;
          note.media = card.media;
          note.number = counter++;
          addThese.push(note);
        }

        if (this.settings.reversed) {
          const tmp = card.back;
          card.back = card.name;
          card.name = tmp;
        }
      }
      deck.cards = Deck.CleanCards(deck.cards.concat(addThese));
    }

    this.payload[0].settings = this.settings;
    this.customExporter.configure(this.payload);
  }

  build(ws: Workspace) {
    if (ws.location !== this.workspace.location) {
      console.debug('workspace location changed for build');
      console.debug(ws.location);
      this.customExporter = new CustomExporter(this.firstDeckName, ws.location);
    }

    this.processPayload(ws);
    return this.customExporter.save();
  }

  writeDeckInfo(ws: Workspace): string {
    if (ws.location !== this.workspace.location) {
      this.customExporter = new CustomExporter(this.firstDeckName, ws.location);
    }

    this.processPayload(ws);
    return this.customExporter.deckInfoPath();
  }

  tryExperimental() {
    const fallback = new FallbackParser(this.files);

    this.payload = fallback.run(this.settings);
    if (
      !this.payload ||
      this.payload.length === 0 ||
      this.totalCardCount() === 0
    ) {
      const markdownSourced =
        isMarkdownFile(this.firstDeckName) ||
        isMarkdownSourcedFiles(this.files);
      throw new EmptyDeckError(markdownSourced ? 'markdown' : undefined);
    }

    this.payload[0].settings = this.settings;
    this.customExporter.configure(this.payload);

    return this.customExporter.save();
  }

  totalCardCount() {
    if (this.payload.length === 0) {
      return 0;
    }
    return this.payload.map((p) => p.cardCount).reduce((a, b) => a + b);
  }

  private loadDOM(contents: string) {
    return cheerio.load(
      this.removeNewlinesInSVGPathAttributeD(
        this.settings.noUnderline
          ? contents.replace(/border-bottom:0.05em solid/g, '')
          : contents
      )
    );
  }

  private loadAndNormalizeDOM(contents: string): { dom: cheerio.CheerioAPI; isNewFormat: boolean } {
    const dom = this.loadDOM(contents);
    const isNewFormat = this.hasNotionNewExportFormat(dom);
    this.normalizeNotionNewExportFormat(dom);
    return { dom, isNewFormat };
  }

  private normalizeNotionNewExportFormat(dom: cheerio.CheerioAPI): void {
    if (!this.hasNotionNewExportFormat(dom)) {
      return;
    }

    // Only preserve nested toggles as HTML content if maxOne is true
    // If maxOne is false, skip the preservation so nested toggles remain as separate elements
    if (this.settings.maxOne) {
      this.preserveNestedTogglesBeforeFlattening(dom);
    }
    this.flattenDisplayContentsElements(dom);
  }

  private preserveNestedTogglesBeforeFlattening(dom: cheerio.CheerioAPI): void {
    dom('[style*="display:contents"] ul.toggle > li > details').each((_, details) => {
      const $details = dom(details);
      this.processNestedTogglesDepthFirst($details, dom);
    });
  }

  private processNestedTogglesDepthFirst($details: cheerio.Cheerio<Element>, dom: cheerio.CheerioAPI): void {
    $details.find('[style*="display:contents"]').each((_, displayContents) => {
      const $displayContents = dom(displayContents);
      const $nestedUl = $displayContents.children('ul.toggle').first();
      
      if ($nestedUl.length > 0) {
        const $li = $nestedUl.children('li').first();
        const $nestedDetails = $li.children('details').first();
        
        if ($nestedDetails.length > 0) {
          this.processNestedTogglesDepthFirst($nestedDetails, dom);
          
          const $summary = $nestedDetails.children('summary').first();
          const summaryHTML = $summary.html()?.trim();

          if (summaryHTML) {
            const $contentAfterSummary = $nestedDetails.contents().not('summary');
            let contentHTML = '';

            $contentAfterSummary.each((_, content) => {
              if (dom(content).is('[style*="display:contents"]')) {
                contentHTML += dom(content).html() || '';
              } else {
                contentHTML += dom(content).toString();
              }
            });

            const nestedDetailsHTML = `<details style="margin-left: 20px; margin-bottom: 10px;">
              <summary>${summaryHTML}</summary>
              ${contentHTML}
            </details>`;
            
            $displayContents.replaceWith(nestedDetailsHTML);
          } else {
            $displayContents.replaceWith($displayContents.contents());
          }
        } else {
          $displayContents.replaceWith($displayContents.contents());
        }
      } else {
        $displayContents.replaceWith($displayContents.contents());
      }
    });
  }

  private hasNotionNewExportFormat(dom: cheerio.CheerioAPI): boolean {
    return dom('[style*="display:contents"]').length > 0;
  }

  private flattenDisplayContentsElements(dom: cheerio.CheerioAPI): void {
    dom('[style*="display:contents"]').each((_, el) => {
      const $el = dom(el);
      $el.replaceWith($el.contents());
    });
  }

  private removeEmptyDisplayContentsElements(
    $container: cheerio.Cheerio<Element>,
    dom: cheerio.CheerioAPI
  ): void {
    $container.find('div[style*="display:contents"]').each((_, divEl) => {
      if (dom(divEl).is(':empty')) {
        dom(divEl).remove();
      }
    });
  }

  private extractCoverImage(dom: cheerio.CheerioAPI) {
    const pageCoverImage = dom('.page-cover-image');
    if (pageCoverImage) {
      return pageCoverImage.attr('src');
    }
    return undefined;
  }

  private extractPageIcon(dom: cheerio.CheerioAPI) {
    const pageIcon = dom('.page-header-icon > .icon');
    return pageIcon.html();
  }

  private extractToggleLists(dom: cheerio.CheerioAPI): Element[] {
    const foundToggleLists = findNotionToggleLists(dom, {
      isCherry: this.settings.isCherry,
      isAll: this.settings.isAll,
      disableIndentedBulletPoints: this.settings.disableIndentedBulletPoints,
    });

    const details: Element[] = dom('details').toArray();

    // Remove duplicate toggles caused by merged ul.toggle
    const uniqueToggles: Element[] = [];
    const seen = new Set();
    for (const t of foundToggleLists) {
      const id = dom(t).attr('id') || dom(t).html();
      if (!seen.has(id)) {
        uniqueToggles.push(t);
        seen.add(id);
      }
    }

    const convertedToggleLists =
      uniqueToggles.length === 0 && details.length > 0
        ? transformDetailsTagToNotionToggleList(dom, details)
        : [];

    return [
      ...uniqueToggles,
      ...convertedToggleLists,
      ...this.findIndentedToggleLists(dom),
    ];
  }

  private buildMCQNote(
    front: string,
    toggleElement: cheerio.Cheerio<Element>,
    dom: cheerio.CheerioAPI,
    correctIndex: number
  ): Note {
    const listItems = toggleElement.find('ul.to-do-list > li, ul.bulleted-list > li').toArray();
    const options = listItems.map((li) => {
      const $li = dom(li);
      $li.find('.checkbox').remove();
      return $li.text().trim();
    });

    const explanation = toggleElement
      .find('> p, > blockquote, > .callout')
      .map((_i, el) => dom(el).html() ?? '')
      .toArray()
      .join('');

    const note = new Note(front, explanation);
    note.mcq = true;
    note.options = options;
    note.correctIndices = [correctIndex];
    return note;
  }

  private extractCards(dom: cheerio.CheerioAPI, toggleList: Element[], isNewFormat: boolean = false): {
    cards: Note[];
    mcqCount: number;
    mcqSkippedCount: number;
  } {
    const cards: Note[] = [];
    let mcqCount = 0;
    let mcqSkippedCount = 0;
    const pageId = dom('article').attr('id');

    toggleList.forEach((t) => {
      // We want to perserve the parent's style, so getting the class
      const p = dom(t);
      const parentUL = p;
      const parentClass = p.attr('class') || '';

      if (this.settings.toggleMode === 'open_toggle') {
        dom('details').attr('open', '');
      } else if (this.settings.toggleMode === 'close_toggle') {
        dom('details').removeAttr('open');
      }

      if (parentUL) {
        dom('details').addClass(parentClass);
        dom('summary').addClass(parentClass);
        const summary = parentUL.find('summary').first();
        let toggle = parentUL.find('details').first();

        if (!toggle?.html()) {
          toggle = parentUL.find('.indented');
        }

        if (summary && summary.text()) {
          const validSummary = (() =>
            preserveNewlinesIfApplicable(
              summary.html() || '',
              this.settings
            ))();
          const front = parentClass
            ? `<div class='${parentClass}'>${validSummary}</div>`
            : validSummary;
          if (toggle || this.settings.maxOne) {
            const toggleHTML = toggle.html();
            if (toggleHTML) {
              const toggleEl = toggle.get(0);
              const mcqEnabled = this.settings.mcqEnabled;
              const correctIndex = mcqEnabled && toggleEl ? isMCQ(toggleEl, dom) : -1;
              const hasMCQShape = mcqEnabled && toggleEl != null && (
                dom(toggleEl).find('ul.to-do-list > li').length >= 2 ||
                dom(toggleEl).find('ul.bulleted-list > li').length >= 2
              );

              if (hasMCQShape && correctIndex >= 0) {
                const note = this.buildMCQNote(front || '', toggle, dom, correctIndex);
                note.notionId = parentUL.attr('id');
                mcqCount++;
                if (
                  (this.settings.isAvocado && this.noteHasAvocado(note)) ||
                  (this.settings.isCherry && !this.noteHasCherry(note))
                ) {
                  console.debug('dropping due to matching rules');
                } else {
                  cards.push(note);
                }
                return;
              }

              if (hasMCQShape && correctIndex === -1) {
                mcqSkippedCount++;
              }

              let b = toggleHTML.replace(summary.html() || '', '');
              if (this.settings.isTextOnlyBack) {
                const paragraphs = dom(toggle).find('> p').toArray();
                b = '';
                for (const paragraph of paragraphs) {
                  if (paragraph) {
                    b += dom(paragraph).html();
                  }
                }
              }

              const backSide = (() => {
                let mangleBackSide = b;
                if (this.settings.maxOne) {
                  mangleBackSide = isNewFormat
                    ? this.removeNestedTogglesNewFormat(b)
                    : this.removeNestedTogglesLegacy(b);
                }
                if (this.settings.perserveNewLines) {
                  mangleBackSide = replaceAll(mangleBackSide, '\n', '<br />');
                }
                return mangleBackSide;
              })();
              const note = new Note(front || '', backSide);
              note.notionId = parentUL.attr('id');
              if (note.notionId && this.settings.addNotionLink) {
                const link = this.getLink(pageId, note);
                if (link !== null) {
                  note.back += link;
                }
              }
              if (
                (this.settings.isAvocado && this.noteHasAvocado(note)) ||
                (this.settings.isCherry && !this.noteHasCherry(note))
              ) {
                console.debug('dropping due to matching rules');
              } else {
                cards.push(note);
              }
            }
          }
        }
      }
    });
    return { cards, mcqCount, mcqSkippedCount };
  }

  private extractCardsFromParagraph(dom: cheerio.CheerioAPI) {
    const paragraphs = dom('p').toArray();
    return paragraphs.map((p) => new Note(dom(p).html() ?? '', ''));
  }

  private extractCardsFromLists(
    dom: cheerio.CheerioAPI,
    disableIndentedBullets: boolean
  ) {
    const cards: Note[] = [];
    const lists = !disableIndentedBullets
      ? [...dom('ul').toArray(), ...dom('ol').toArray()]
      : [...dom('.page-body > .bulleted-list').toArray()];

    lists.forEach((list) => {
      if (!disableIndentedBullets) {
        for (const child of dom(list).find('li')) {
          cards.push(new Note(dom(child).html() ?? '', ''));
        }
      } else {
        cards.push(new Note(dom(list).html() ?? '', ''));
      }
    });

    return cards;
  }

}
