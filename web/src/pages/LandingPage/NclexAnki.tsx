import LandingPage from './LandingPage';
import nclexCopy from './copy/nclex';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function NclexAnki({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={nclexCopy} setErrorMessage={setErrorMessage} />;
}
