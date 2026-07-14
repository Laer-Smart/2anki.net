import LandingPage from './LandingPage';
import mcatCopy from './copy/mcat';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function McatAnki({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={mcatCopy} setErrorMessage={setErrorMessage} />;
}
