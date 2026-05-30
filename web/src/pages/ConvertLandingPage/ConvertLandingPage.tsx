import { useParams } from 'react-router-dom';
import type { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import LandingPage from '../LandingPage/LandingPage';
import NotFoundPage from '../NotFoundPage';
import ApkgCsvExportForm from './ApkgCsvExportForm';
import { CONVERT_LANDING_PAGES } from './convertLandingConfig';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

function ConvertLandingPage({ setErrorMessage }: Readonly<Props>) {
  const { slug } = useParams<{ slug: string }>();
  const copy = slug == null ? undefined : CONVERT_LANDING_PAGES.get(slug);

  if (copy != null) {
    const heroSlot = slug === 'apkg-to-csv' ? <ApkgCsvExportForm /> : undefined;
    return (
      <LandingPage
        copy={copy}
        setErrorMessage={setErrorMessage}
        heroSlot={heroSlot}
      />
    );
  }

  return <NotFoundPage />;
}

export default ConvertLandingPage;
