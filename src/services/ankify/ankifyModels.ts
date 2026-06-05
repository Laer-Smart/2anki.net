import { NOTION_STYLE } from '../../templates/helper';
import { AnkiConnectCreateModelParams } from './AnkiConnectClient';

export const ANKIFY_BASIC_MODEL = 'Ankify Basic';
export const ANKIFY_CLOZE_MODEL = 'Ankify Cloze';

export const ANKIFY_BASIC_FIELDS = ['Front', 'Back'] as const;
export const ANKIFY_CLOZE_FIELDS = ['Text', 'Back Extra'] as const;

const ANKIFY_CARD_OVERRIDES = `
.card {
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 18px;
  line-height: 1.5;
  color: rgb(55, 53, 47);
  background-color: rgb(255, 255, 255);
  text-align: left;
  padding: 32px 24px;
  max-width: 720px;
  margin: 0 auto;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.nightMode.card,
.night_mode .card {
  color: rgba(255, 255, 255, 0.9);
  background-color: rgb(25, 25, 25);
}

.front-text-pre {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  text-align: center;
  margin-bottom: 0.25em;
}

.front-text-post {
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: rgba(55, 53, 47, 0.65);
  text-align: center;
  letter-spacing: -0.005em;
}

.back-text { display: block; }

.extra {
  display: block;
  margin-top: 1em;
  color: rgba(55, 53, 47, 0.6);
  font-size: 0.9em;
}

hr#answer {
  border: none;
  border-top: 1px solid rgba(55, 53, 47, 0.16);
  margin: 1.5em 0;
}

mark { background: rgba(255, 212, 0, 0.25); color: inherit; padding: 0 2px; border-radius: 2px; }

.cloze {
  font-weight: 600;
  color: rgb(11, 110, 153);
}
.nightMode .cloze, .night_mode .cloze { color: rgb(82, 156, 202); }

@media (max-width: 480px) {
  .card { padding: 20px 16px; font-size: 17px; }
  .front-text-pre { font-size: 1.3rem; }
}
`.trim();

const ANKIFY_CARD_STYLING = `${NOTION_STYLE}\n\n${ANKIFY_CARD_OVERRIDES}`;

export const ankifyBasicCreateModelParams =
  (): AnkiConnectCreateModelParams => ({
    modelName: ANKIFY_BASIC_MODEL,
    inOrderFields: [...ANKIFY_BASIC_FIELDS],
    css: ANKIFY_CARD_STYLING,
    isCloze: false,
    cardTemplates: [
      {
        Name: 'Card 1',
        Front: '<span class="front-text-pre">{{Front}}</span>',
        Back: '<span class="front-text-post">{{Front}}</span><hr id="answer"><span class="back-text">{{Back}}</span>',
      },
    ],
  });

export const ankifyClozeCreateModelParams =
  (): AnkiConnectCreateModelParams => ({
    modelName: ANKIFY_CLOZE_MODEL,
    inOrderFields: [...ANKIFY_CLOZE_FIELDS],
    css: ANKIFY_CARD_STYLING,
    isCloze: true,
    cardTemplates: [
      {
        Name: 'Cloze',
        Front: '{{cloze:Text}}',
        Back: '{{cloze:Text}}<hr id="answer"><span class="extra">{{Back Extra}}</span>',
      },
    ],
  });
