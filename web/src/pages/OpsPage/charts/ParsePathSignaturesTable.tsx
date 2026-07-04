import { formatCount, formatLastSeen } from '../opsHelpers';
import { OpsMetricsParsePathPoint } from '../opsTypes';
import styles from '../OpsPage.module.css';

interface ParsePathSignaturesTableProps {
  rows: OpsMetricsParsePathPoint[];
}

export default function ParsePathSignaturesTable({
  rows,
}: Readonly<ParsePathSignaturesTableProps>) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Parse path</th>
          <th>Occurrences</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.parse_path}>
            <td>{row.parse_path}</td>
            <td className={styles.numeric}>{formatCount(row.occurrences)}</td>
            <td className={styles.numeric}>{formatLastSeen(row.last_seen)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
