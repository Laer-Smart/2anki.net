import { CardOptionDetail } from './CardOptionDetail';

const supportedOptions = (): CardOptionDetail[] => {
  const v = [
    new CardOptionDetail(
      'add-notion-link',
      'Add Notion link',
      'Add a link back to the Notion page on each card. Turn on Use Notion ID alongside this to avoid duplicates.',
      false
    ),
    new CardOptionDetail(
      'use-notion-id',
      'Use Notion ID',
      'Identify each card by its Notion block ID instead of its content. Prevents duplicates when you re-upload an updated page.',
      true
    ),
    new CardOptionDetail(
      'all',
      'Use all toggle lists',
      'Pull toggles from anywhere on the page, including nested ones. Off, only top-level toggles become cards.',
      true
    ),
    new CardOptionDetail(
      'paragraph',
      'Use plain text for back',
      'Strip formatting from the back of each card and keep only the text. Use this when colors and styles distract from review.',
      false
    ),
    new CardOptionDetail(
      'cherry',
      'Cherry-pick using 🍒 emoji',
      'Only build cards from toggles that contain 🍒 in the header or body. Use this to publish a few cards from a long page.',
      false
    ),
    new CardOptionDetail(
      'avocado',
      'Skip toggles with the 🥑 emoji',
      'Ignore any toggle marked with 🥑. Use this to exclude drafts or notes without editing the page.',
      false
    ),
    new CardOptionDetail(
      'tags',
      'Treat strikethrough as tags',
      'Turn strikethrough text into Anki tags. Strikethrough at the page level becomes a global tag; inside a toggle it tags only that card.',
      false
    ),
    new CardOptionDetail(
      'cloze',
      'Cloze deletion',
      'Create cloze cards from inline code and {{c1::}} syntax in your toggles.',
      true
    ),
    new CardOptionDetail(
      'cloze-from-toggle-content',
      'Inline code toggles become cloze',
      "When a toggle's contents contain inline code, hide the code as a cloze and use the toggle header as the hint. Works only when Cloze deletion is on.",
      false
    ),
    new CardOptionDetail(
      'enable-input',
      'Treat bold text as input',
      'Hide bold words on the front of the card so you type them during review. Useful for vocabulary and exact-answer recall.',
      false
    ),
    new CardOptionDetail(
      'basic-reversed',
      'Basic and reversed',
      'Create two cards per toggle: question to answer, and answer to question.',
      false
    ),
    new CardOptionDetail(
      'reversed',
      'Reversed only',
      'Create only the reversed card, swapping front and back. Useful when the back is an image you want to see first.',
      false
    ),
    new CardOptionDetail(
      'no-underline',
      'Remove underlines',
      'Strip underline formatting from card text. Turn this on if Notion underlines are showing up where you do not want them.',
      false
    ),
    new CardOptionDetail(
      'max-one-toggle-per-card',
      'Maximum one toggle per card',
      'Keep each card focused on a single toggle. Combine with Use all toggle lists to turn every nested toggle into its own card.',
      true
    ),
    new CardOptionDetail(
      'remove-mp3-links',
      'Remove MP3 links from audio files',
      'Hide raw MP3 URLs on cards while keeping the audio playable.',
      true
    ),
    new CardOptionDetail(
      'perserve-newlines',
      'Preserve newlines in toggle header and body',
      'Keep line breaks made with Shift+Enter inside toggles. Applies to every card type.',
      true
    ),
    new CardOptionDetail(
      'process-pdfs',
      'Process PDF files',
      'Convert PDFs found inside ZIP uploads into cards. Turn off to skip them and finish ZIP uploads faster.',
      true
    ),
    new CardOptionDetail(
      'pdf-extract-text',
      'Extract text from PDFs',
      'Turn the text inside a PDF into cards. Leave off to render each page as an image — page 1 on the front, page 2 on the back.',
      false
    ),
    new CardOptionDetail(
      'markdown-nested-bullet-points',
      'Markdown nested bullet points',
      'Turn bullets and their sub-bullets into front-and-back cards. Recommended for Obsidian exports.',
      true
    ),
    new CardOptionDetail(
      'vertex-ai-pdf-questions',
      'Generate questions from PDF uploads',
      'Use Vertex AI to draft questions from your PDFs. Your content is sent to Google Cloud for processing.',
      false
    ),
    new CardOptionDetail(
      'disable-indented-bullets',
      'Disable indented bullets',
      'Keep indented bullets attached to their parent instead of becoming separate cards.',
      false
    ),
    new CardOptionDetail(
      'image-quiz-html-to-anki',
      'Convert image quiz HTML to Anki cards',
      'Use OCR to pull images and answers out of HTML quizzes and turn them into cards.',
      false
    ),
    new CardOptionDetail(
      'embed-images',
      'Embed images in cards',
      'Pack image bytes into the deck so cards render offline. Turn off to ship a leaner deck when images are pushing the upload over the size cap.',
      true
    ),
    new CardOptionDetail(
      'claude-ai-flashcards',
      'Generate flashcards with Claude AI',
      'Use Claude AI to draft cards from your content. Produces stronger results on dense or unstructured documents.',
      false
    ),
    new CardOptionDetail(
      'ai-comprehensive',
      'Comprehensive AI mode',
      'Aim for hundreds of cards per chapter instead of dozens. Conversions take longer. Paid plans only.',
      false
    ),
    new CardOptionDetail(
      'share-files-for-debugging',
      'Share files for debugging when conversion fails',
      'On a failed conversion, send the uploaded files and error details to the 2anki team to investigate. Off by default to keep your notes private.',
      false
    ),
  ];

  return v.filter(Boolean);
};

export default supportedOptions;
