import LandingPage from './LandingPage';
import goodnotesCopy from './copy/goodnotes';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function GoodnotesToAnki({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={goodnotesCopy} setErrorMessage={setErrorMessage} />;
}
