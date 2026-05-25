import LandingPage from './LandingPage';
import aiFlashcardGeneratorCopy from './copy/ai-flashcard-generator';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function AiFlashcardGenerator({
  setErrorMessage,
}: Readonly<Props>) {
  return (
    <LandingPage
      copy={aiFlashcardGeneratorCopy}
      setErrorMessage={setErrorMessage}
    />
  );
}
