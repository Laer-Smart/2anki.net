import LandingPage from './LandingPage';
import nursingCopy from './copy/nursing';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function NursingFlashcards({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={nursingCopy} setErrorMessage={setErrorMessage} />;
}
