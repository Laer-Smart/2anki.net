import { Fragment } from 'react';

import styles from './ComparisonTable.module.css';

const PLANS = ['Free', 'Day / Week pass', 'Unlimited', 'Auto Sync', 'Lifetime'];
const PLAN_PRICES = ['$0', '$4 / $9', '$6 / mo', '$30 / mo', 'From $345'];

type Cell = boolean | string;

interface Row {
  label: string;
  values: [Cell, Cell, Cell, Cell, Cell];
}

interface Group {
  name: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    name: 'Usage',
    rows: [
      { label: 'Cards per month', values: ['100', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
      { label: 'Run multiple conversions at once', values: [false, true, true, true, true] },
      { label: 'Anki → Notion imports', values: ['1,000 / mo', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
    ],
  },
  {
    name: 'Cards & formats',
    rows: [
      { label: 'PDF and large Notion exports', values: [false, true, true, true, true] },
      { label: 'Image occlusion', values: [false, true, true, true, true] },
      { label: 'Custom card templates', values: [false, true, true, true, true] },
      { label: 'No ads', values: [false, true, true, true, true] },
    ],
  },
  {
    name: 'Notion sync',
    rows: [
      { label: 'Auto Sync every 5 minutes', values: [false, false, false, true, true] },
    ],
  },
  {
    name: 'Billing',
    rows: [
      { label: 'No subscription', values: [true, true, false, false, true] },
    ],
  },
];

function CheckIcon() {
  return (
    <svg className={styles.check} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function renderCell(value: Cell) {
  if (value === true) {
    return (
      <>
        <CheckIcon />
        <span className={styles.srOnly}>Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span className={styles.dash} aria-hidden="true">
          –
        </span>
        <span className={styles.srOnly}>Not included</span>
      </>
    );
  }
  return value;
}

export function ComparisonTable() {
  return (
    <section className={styles.section} aria-labelledby="comparison-heading">
      <h2 id="comparison-heading" className={styles.heading}>
        Compare every plan
      </h2>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.cornerCell}>
                <span className={styles.srOnly}>Feature</span>
              </th>
              {PLANS.map((plan, i) => (
                <th key={plan} scope="col" className={styles.planCell}>
                  <span className={styles.planName}>{plan}</span>
                  <span className={styles.planPrice}>{PLAN_PRICES[i]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group.name}>
                <tr className={styles.groupRow}>
                  <th scope="colgroup" colSpan={PLANS.length + 1} className={styles.groupCell}>
                    {group.name}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className={styles.row}>
                    <th scope="row" className={styles.rowLabel}>
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td key={PLANS[i]} className={styles.valueCell}>
                        {renderCell(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
