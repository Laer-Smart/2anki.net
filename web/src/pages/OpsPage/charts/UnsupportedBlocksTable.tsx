import { formatCount } from '../opsHelpers';
import { OpsMetricsUnsupportedBlockPoint } from '../opsTypes';
import styles from '../OpsPage.module.css';

interface UnsupportedBlocksTableProps {
  rows: OpsMetricsUnsupportedBlockPoint[];
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const padTwo = (n: number): string => n.toString().padStart(2, '0');

const formatLastSeen = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getUTCDate()} ${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())} UTC`;
};

export default function UnsupportedBlocksTable({
  rows,
}: Readonly<UnsupportedBlocksTableProps>) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Block type</th>
          <th>Occurrences</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.block_type}>
            <td>{row.block_type}</td>
            <td className={styles.numeric}>{formatCount(row.occurrences)}</td>
            <td className={styles.numeric}>{formatLastSeen(row.last_seen)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
