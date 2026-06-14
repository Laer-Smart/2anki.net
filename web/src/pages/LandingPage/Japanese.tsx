import LandingPage from './LandingPage';
import japaneseCopy from './copy/japanese';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function Japanese({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={japaneseCopy} setErrorMessage={setErrorMessage} />;
}
