import {
  AnkiAppExportError,
  ANKI_APP_MALFORMED_XML_MESSAGE,
  ANKI_APP_NO_CARDS_MESSAGE,
  parseAnkiAppXml,
} from './parseAnkiAppXml';

const ISSUE_SAMPLE_XML = `<deck name="French Translation Deck">
    <fields>
        <text lang="en-US" name="Text" sides="11">
        </text>
        <text lang="fr-FR" name="Translation" sides="01">
            <sources>
                <translation>
                    <ref name="Text">
                    </ref>
                </translation>
            </sources>
        </text>
    </fields>
    <cards>
        <card>
            <field name="Text">
                Hello
            </field>
            <field name="Translation">
            \t\tBonjour
            </field>
        </card>
    </cards>
</deck>
`;

describe('parseAnkiAppXml', () => {
  it('round-trips the documented AnkiApp sample to a front/back note', () => {
    const deck = parseAnkiAppXml(ISSUE_SAMPLE_XML);

    expect(deck.name).toBe('French Translation Deck');
    expect(deck.notes).toHaveLength(1);
    expect(deck.notes[0].name).toBe('Hello');
    expect(deck.notes[0].back).toBe('Bonjour');
    expect(deck.skippedMediaOnlyCount).toBe(0);
  });

  it('throws the malformed-XML message for content without a deck root', () => {
    expect(() => parseAnkiAppXml('not a deck export at all')).toThrow(
      AnkiAppExportError
    );
    expect(() => parseAnkiAppXml('not a deck export at all')).toThrow(
      ANKI_APP_MALFORMED_XML_MESSAGE
    );
  });

  it('throws the no-cards message for a deck without cards', () => {
    const xml =
      '<deck name="Empty"><fields><text name="Front" sides="10"/></fields><cards></cards></deck>';
    expect(() => parseAnkiAppXml(xml)).toThrow(ANKI_APP_NO_CARDS_MESSAGE);
  });

  it('falls back to positional front/back when card field names do not match the definitions', () => {
    const xml = `<deck name="Mismatch">
      <fields>
        <text lang="en-US" name="English text" sides="11"></text>
        <text lang="fr-FR" name="French translation" sides="01"></text>
      </fields>
      <cards>
        <card>
          <field name="Text">Hello</field>
          <field name="Translation">Bonjour</field>
        </card>
      </cards>
    </deck>`;

    const deck = parseAnkiAppXml(xml);

    expect(deck.notes).toHaveLength(1);
    expect(deck.notes[0].name).toBe('Hello');
    expect(deck.notes[0].back).toBe('Bonjour');
  });

  it('keeps allowlisted markup and strips scripts from rich-text fields', () => {
    const xml = `<deck name="Rich">
      <cards>
        <card>
          <field name="Front"><rich-text lang="en-US">Be <b>bold</b>.<script>alert(1)</script></rich-text></field>
          <field name="Back"><rich-text lang="en-US">Stay <i>calm</i>.</rich-text></field>
        </card>
      </cards>
    </deck>`;

    const deck = parseAnkiAppXml(xml);

    expect(deck.notes[0].name).toBe('Be <b>bold</b>.');
    expect(deck.notes[0].back).toBe('Stay <i>calm</i>.');
  });

  it('renders markdown fields as HTML', () => {
    const xml = `<deck name="Md">
      <cards>
        <card>
          <field name="Front"><markdown># Be ahead</markdown></field>
          <field name="Back"><markdown>Stay *sharp*</markdown></field>
        </card>
      </cards>
    </deck>`;

    const deck = parseAnkiAppXml(xml);

    expect(deck.notes[0].name).toBe('<h1>Be ahead</h1>');
    expect(deck.notes[0].back).toBe('<p>Stay <em>sharp</em></p>');
  });

  it.each(['tts', 'tex', 'code', 'japanese', 'chinese', 'translation'])(
    'degrades %s fields to their stored text',
    (type) => {
      const xml = `<deck name="Degrade">
        <cards>
          <card>
            <field name="Front"><${type}>stored value</${type}></field>
            <field name="Back">plain back</field>
          </card>
        </cards>
      </deck>`;

      const deck = parseAnkiAppXml(xml);

      expect(deck.notes[0].name).toBe('stored value');
      expect(deck.notes[0].back).toBe('plain back');
    }
  );

  it('escapes HTML in plain text fields', () => {
    const xml = `<deck name="Escape">
      <cards>
        <card>
          <field name="Front">1 &lt; 2 &amp; 3</field>
          <field name="Back">true</field>
        </card>
      </cards>
    </deck>`;

    const deck = parseAnkiAppXml(xml);

    expect(deck.notes[0].name).toBe('1 &lt; 2 &amp; 3');
  });

  it('skips and counts cards left with an empty side after dropping media fields', () => {
    const xml = `<deck name="Media">
      <cards>
        <card>
          <field name="Front">What sound is this?</field>
          <field name="Back"><audio id="abc123"/></field>
        </card>
        <card>
          <field name="Front">Capital of France</field>
          <field name="Back">Paris</field>
        </card>
      </cards>
    </deck>`;

    const deck = parseAnkiAppXml(xml);

    expect(deck.notes).toHaveLength(1);
    expect(deck.notes[0].name).toBe('Capital of France');
    expect(deck.skippedMediaOnlyCount).toBe(1);
  });

  it('throws the no-cards message when every card is media-only', () => {
    const xml = `<deck name="AllMedia">
      <cards>
        <card>
          <field name="Front"><img id="abc"/></field>
          <field name="Back"><video id="def"/></field>
        </card>
      </cards>
    </deck>`;

    expect(() => parseAnkiAppXml(xml)).toThrow(ANKI_APP_NO_CARDS_MESSAGE);
  });

  it('merges deck tags and card tags onto each note', () => {
    const xml = `<deck name="Tagged" tags="deck_tag_1,deck_tag_2">
      <cards>
        <card tags="tag1, tag2">
          <field name="Front">Hello</field>
          <field name="Back">Goodbye</field>
        </card>
      </cards>
    </deck>`;

    const deck = parseAnkiAppXml(xml);

    expect(deck.notes[0].tags).toEqual([
      'deck_tag_1',
      'deck_tag_2',
      'tag1',
      'tag2',
    ]);
  });

  it('uses the sides attribute to put shared fields on the front only', () => {
    const xml = `<deck name="Sides">
      <fields>
        <text name="Question" sides="11"></text>
        <text name="Hintish" sides="10"></text>
        <text name="Answer" sides="01"></text>
      </fields>
      <cards>
        <card>
          <field name="Question">Q</field>
          <field name="Hintish">H</field>
          <field name="Answer">A</field>
        </card>
      </cards>
    </deck>`;

    const deck = parseAnkiAppXml(xml);

    expect(deck.notes[0].name).toBe('Q<br>H');
    expect(deck.notes[0].back).toBe('A');
  });
});
