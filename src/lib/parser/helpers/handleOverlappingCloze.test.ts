import handleOverlappingCloze from './handleOverlappingCloze';

const countClozes = (body: string) => (body.match(/\{\{c1::/g) || []).length;

describe('handleOverlappingCloze', () => {
  const items = [
    'I pledge allegiance',
    'to the flag',
    'of the United States',
    'of America',
  ];

  describe('show-all', () => {
    it('returns one body per item', () => {
      expect(handleOverlappingCloze(items, 'show-all')).toHaveLength(4);
    });

    it('puts exactly one cloze in every body', () => {
      for (const body of handleOverlappingCloze(items, 'show-all')) {
        expect(countClozes(body)).toBe(1);
      }
    });

    it('wraps item i in body i', () => {
      const bodies = handleOverlappingCloze(items, 'show-all');
      expect(bodies[0]).toContain('{{c1::I pledge allegiance}}');
      expect(bodies[2]).toContain('{{c1::of the United States}}');
    });

    it('keeps the other items visible as plain text', () => {
      const bodies = handleOverlappingCloze(items, 'show-all');
      expect(bodies[0]).toContain('to the flag');
      expect(bodies[0]).toContain('of the United States');
      expect(bodies[0]).toContain('of America');
    });
  });

  describe('windowed', () => {
    it('returns one body per item', () => {
      expect(handleOverlappingCloze(items, 'windowed')).toHaveLength(4);
    });

    it('puts exactly one cloze in every body', () => {
      for (const body of handleOverlappingCloze(items, 'windowed')) {
        expect(countClozes(body)).toBe(1);
      }
    });

    it('shows one line before and one line after the clozed item', () => {
      const bodies = handleOverlappingCloze(items, 'windowed');
      expect(bodies[1]).toContain('I pledge allegiance');
      expect(bodies[1]).toContain('{{c1::to the flag}}');
      expect(bodies[1]).toContain('of the United States');
      expect(bodies[1]).not.toContain('of America');
    });

    it('omits the line before for the first item', () => {
      const bodies = handleOverlappingCloze(items, 'windowed');
      expect(bodies[0]).toContain('{{c1::I pledge allegiance}}');
      expect(bodies[0]).toContain('to the flag');
      expect(bodies[0]).not.toContain('of the United States');
    });

    it('omits the line after for the last item', () => {
      const bodies = handleOverlappingCloze(items, 'windowed');
      const last = bodies[3];
      expect(last).toContain('of the United States');
      expect(last).toContain('{{c1::of America}}');
      expect(last).not.toContain('to the flag');
    });
  });

  describe('fallback', () => {
    it('returns one body clozing the only item when given a single item', () => {
      const bodies = handleOverlappingCloze(['only line'], 'show-all');
      expect(bodies).toHaveLength(1);
      expect(bodies[0]).toBe('{{c1::only line}}');
    });

    it('returns an empty array when given no items', () => {
      expect(handleOverlappingCloze([], 'show-all')).toEqual([]);
    });

    it('skips blank items when building bodies', () => {
      const bodies = handleOverlappingCloze(
        ['first', '   ', 'second'],
        'show-all'
      );
      expect(bodies).toHaveLength(2);
      expect(bodies[0]).toContain('{{c1::first}}');
      expect(bodies[1]).toContain('{{c1::second}}');
    });
  });
});
