import LandingPage from './LandingPage';
import ankiToNotionCopy from './copy/ankiToNotion';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function AnkiToNotion({ setErrorMessage }: Readonly<Props>) {
  return (
    <LandingPage copy={ankiToNotionCopy} setErrorMessage={setErrorMessage} />
  );
}
