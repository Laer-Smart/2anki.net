import LandingPage from './LandingPage';
import usmleCopy from './copy/usmle';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function UsmleAnki({ setErrorMessage }: Readonly<Props>) {
  return <LandingPage copy={usmleCopy} setErrorMessage={setErrorMessage} />;
}
