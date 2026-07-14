import type { WhatComesAcrossItem } from '../types';

export const ankiFidelityProof: WhatComesAcrossItem[] = [
  {
    title: 'Cloze deletions stay clickable',
    body: '{{c1::...}} becomes a real Anki cloze card, not plain text.',
  },
  {
    title: 'Images render in the card',
    body: 'Embedded images come across and display on the front or back.',
  },
  {
    title: 'Tags carry over',
    body: 'Strikethrough in Notion or a tag column in CSV attaches to every card in the deck.',
  },
  {
    title: 'Correct note types',
    body: 'Basic, Cloze, and front/back map to the right Anki note type so import is clean.',
  },
  {
    title: 'No junk in your cards',
    body: 'No empty backs, no stray #, *, or $ characters left over from your notes.',
  },
];
