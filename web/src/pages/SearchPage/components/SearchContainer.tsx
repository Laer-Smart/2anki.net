import { ErrorHandlerType } from '../../../components/errors/helpers/getErrorMessage';
import Backend from '../../../lib/backend';

import useSearchQuery from '../helpers/useSearchQuery';
import SearchPresenter from './SearchPresenter';

interface SearchContainerProps {
  backend: Backend;
  setError: ErrorHandlerType;
  workSpace: string | null;
  isLoggedIn: boolean;
}

export default function SearchContainer({
  backend,
  setError,
  workSpace,
  isLoggedIn,
}: Readonly<SearchContainerProps>) {
  const {
    myPages,
    inProgress,
    triggerSearch,
    isLoading,
    setSearchQuery,
    searchQuery,
  } = useSearchQuery(backend, setError);

  return (
    <SearchPresenter
      setError={setError}
      myPages={myPages}
      inProgress={isLoading || inProgress}
      setSearchQuery={setSearchQuery}
      searchQuery={searchQuery}
      triggerSearch={triggerSearch}
      workSpace={workSpace}
      isLoggedIn={isLoggedIn}
    />
  );
}
