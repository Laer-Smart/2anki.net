import { getAnthropicClient } from '../../../lib/claude/ClaudeService';
import { convertWithClaude } from './claudeFileConversion';

const IMAGE_TO_HTML_SYSTEM_PROMPT = `Convert the text in this image to the following format for (every question is their own ul):

        <ul class="toggle">
          <li>
           <details>
            <summary>
                n) question
            </summary>
        <p>A) ..., </p>
        <p>B)... </p>
        etc.
        <p>and finally Answer: D</p>
           </details>
          </li>
          </ul>

        —
        - Extra rules: n=is the number for the question, question=the question text
    - Add newline between the options
    - If you are not able to detect the pattern above, try converting this into a question and answer format`;

export function removeFirstAndLastLine(content: string): string {
  const lines = content.split('\n');
  return lines.slice(1, -1).join('\n');
}

export const convertImageToHTML = async (
  imageData: string
): Promise<string> => {
  const client = getAnthropicClient();
  const htmlContent = await convertWithClaude(client, IMAGE_TO_HTML_SYSTEM_PROMPT, [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: imageData,
      },
    },
  ]);
  return removeFirstAndLastLine(htmlContent);
};
