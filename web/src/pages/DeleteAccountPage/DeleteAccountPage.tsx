import React from 'react';

import Cookies from 'universal-cookie';
import { redirectToFrontPage } from '../../lib/redirects';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import styles from '../AccountPage/AccountPage.module.css';
import sharedStyles from '../../styles/shared.module.css';

interface Prop {
  setError: ErrorHandlerType;
}

export function DeleteAccountPage({ setError }: Readonly<Prop>) {
  const [count, setCount] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const deleteButtonText = count === 0 ? 'Delete' : 'Yes, delete account';

  const handleDelete = async () => {
    if (count < 1) {
      setCount(count + 1);
      return;
    }

    setIsDeleting(true);
    try {
      await get2ankiApi().deleteAccount(count === 2);
      localStorage.clear();
      sessionStorage.clear();
      new Cookies().remove('token');
      redirectToFrontPage();
    } catch (error) {
      setError(error);
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={sharedStyles.pageHeader}>
        <h1 className={sharedStyles.title}>Delete account</h1>
        <p className={sharedStyles.subtitle}>
          This action is irreversible and will cancel any active subscriptions.
        </p>
      </header>
      <div className={styles.mainCard}>
        <p
          className={`${sharedStyles.smallDescription} ${sharedStyles.marginBottomLg}`}
        >
          Are you sure you want to delete your account? All of your uploads,
          favorites, and preferences will be removed.
        </p>

        {isDeleting && (
          <div className={sharedStyles.infoBox} role="status">
            Deleting your account and cancelling subscriptions
          </div>
        )}

        <button
          onClick={handleDelete}
          className={styles.dangerButton}
          type="button"
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting' : deleteButtonText}
        </button>
        <p
          className={`${sharedStyles.smallDescription} ${sharedStyles.marginTopLg}`}
        >
          You may also want to{' '}
          <a
            href="https://www.notion.so/help/add-and-manage-integrations-with-the-api"
            target="_blank"
            rel="noreferrer"
          >
            disconnect 2anki from your Notion workspace
          </a>
          .
        </p>
      </div>
    </div>
  );
}
