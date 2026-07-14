import LandingPage from './LandingPage';
import step1Copy from './copy/step1';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function Step1Anki({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={step1Copy} setErrorMessage={setErrorMessage} />;
}
