import LandingPage from './LandingPage';
import powerpointCopy from './copy/powerpoint';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function PowerpointToAnki({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={powerpointCopy} setErrorMessage={setErrorMessage} />;
}
