import { Dispatch, SetStateAction, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ErrorHandlerType } from '../../../../components/errors/helpers/getErrorMessage';
import DotsHorizontal from '../../../../components/icons/DotsHorizontal';
import EyeIcon from '../../../../components/icons/EyeIcon';
import { get2ankiApi } from '../../../../lib/backend/get2ankiApi';
import NotionObject from '../../../../lib/interfaces/NotionObject';
import ObjectAction from '../actions/ObjectAction';
import { BlockIcon } from '../BlockIcon';
import styles from './SearchObjectEntry.module.css';

interface Props {
  isFavorite: boolean | undefined;
  title: string;
  icon: string | undefined;
  url: string;
  id: string;
  type: string;
  setFavorites: Dispatch<SetStateAction<NotionObject[]>>;
  setError: ErrorHandlerType;
}

type ConvertStatus =
  | 'idle'
  | 'queued'
  | 'in_progress'
  | 'paywall'
  | 'conflict'
  | 'error';

const getType = (data: string | { object: string }): string | null => {
  if (typeof data === 'object' && 'object' in data) {
    return data.object;
  }
  return typeof data === 'string' ? data : null;
};

function SearchObjectEntry(props: Readonly<Props>) {
  const { title, icon, url, id, type, setError } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<ConvertStatus>('idle');
  const [restarted, setRestarted] = useState(false);

  const openRules = () => {
    const params = new URLSearchParams();
    params.set('title', title);
    const resolvedType = getType(type);
    if (resolvedType) params.set('type', resolvedType);
    const notionSearchReturn = new URLSearchParams({ q: title });
    params.set(
      'returnTo',
      `${location.pathname}?${notionSearchReturn.toString()}`
    );
    navigate(`/rules/${encodeURIComponent(id)}?${params.toString()}`);
  };

  const handleConvert = (event: React.MouseEvent) => {
    event.preventDefault();
    if (status !== 'idle') return;
    setStatus('in_progress');
    get2ankiApi()
      .convert(id, getType(type), title)
      .then(async (response) => {
        if (response.status === 202) {
          const body = await response.json().catch(() => null);
          setRestarted(body?.restarted === true);
          setStatus('queued');
        } else if (response.status === 409) {
          setStatus('conflict');
        } else if (response.status === 402) {
          setStatus('paywall');
        } else {
          setStatus('error');
          const text = await response.text().catch(() => '');
          if (text) setError(text);
        }
      })
      .catch((error) => {
        setStatus('error');
        setError(error);
      });
  };

  const isConverting = status === 'in_progress';
  const isQueued = status === 'queued';

  return (
    <div className={styles.entry} data-hj-suppress>
      <div className={styles.objectMeta}>
        <BlockIcon icon={icon} />
        <span>{title}</span>
      </div>
      <div className={styles.objectActions}>
        {status === 'queued' && (
          <span className={styles.convertStatus}>
            {restarted ? 'Re-making your deck — ' : 'Added to your downloads — '}
            <Link to="/downloads">view</Link>
          </span>
        )}
        {status === 'paywall' && (
          <span className={styles.convertStatus}>
            Free plan — one conversion at a time.{' '}
            <Link to="/pricing">Upgrade</Link> or try{' '}
            <Link to="/ankify">Auto Sync</Link>.
          </span>
        )}
        {status === 'conflict' && (
          <span className={styles.convertStatus}>
            Already converting this page.
          </span>
        )}
        {status === 'error' && (
          <span className={styles.convertStatus}>
            Couldn&apos;t queue this page. Try again.
          </span>
        )}
        <ObjectAction
          url={url}
          image="/icons/Anki_app_logo.png"
          label={isConverting || isQueued ? 'In progress' : 'Convert to Anki'}
          onClick={handleConvert}
          disabled={isConverting || isQueued}
        />
        <ObjectAction
          url={url}
          image="/icons/Notion_app_logo.png"
          label={`Open ${title} in Notion`}
        />
        {getType(type) !== 'database' && (
          <Link
            to={`/preview/${encodeURIComponent(id)}`}
            className={styles.rulesButton}
            aria-label={`Preview ${title}`}
            title={`Preview ${title}`}
          >
            <EyeIcon width={32} height={32} />
          </Link>
        )}
        <button
          type="button"
          className={styles.rulesButton}
          onClick={openRules}
          aria-label={`Configure rules for ${title}`}
          title={`Configure rules for ${title}`}
        >
          <DotsHorizontal width={32} height={32} />
        </button>
      </div>
    </div>
  );
}

export default SearchObjectEntry;
