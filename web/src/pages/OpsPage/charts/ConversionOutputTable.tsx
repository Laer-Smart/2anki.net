import { formatCount, formatLastSeen, formatPercent } from '../opsHelpers';
import { OpsMetricsConversionOutputPoint } from '../opsTypes';
import styles from '../OpsPage.module.css';

interface ConversionOutputTableProps {
  rows: OpsMetricsConversionOutputPoint[];
}

const emptyBackPercent = (row: OpsMetricsConversionOutputPoint): number => {
  if (row.cards <= 0) return 0;
  return (row.empty_back_cards / row.cards) * 100;
};

export default function ConversionOutputTable({
  rows,
}: Readonly<ConversionOutputTableProps>) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Source</th>
          <th>Decks</th>
          <th>Cards</th>
          <th>Empty backs</th>
          <th>Empty-back %</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.source}>
            <td>{row.source}</td>
            <td className={styles.numeric}>{formatCount(row.decks)}</td>
            <td className={styles.numeric}>{formatCount(row.cards)}</td>
            <td className={styles.numeric}>
              {formatCount(row.empty_back_cards)}
            </td>
            <td className={styles.numeric}>
              {formatPercent(emptyBackPercent(row))}
            </td>
            <td className={styles.numeric}>{formatLastSeen(row.last_seen)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
