import LandingPage from './LandingPage';
import medicalLectureSlidesCopy from './copy/medical-lecture-slides';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export default function AnkiFromMedicalLectureSlides({
  setErrorMessage,
}: Readonly<Props>) {
  return (
    <LandingPage
      copy={medicalLectureSlidesCopy}
      setErrorMessage={setErrorMessage}
    />
  );
}
