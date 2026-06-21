import { Fragment } from 'react';

import styles from './ComparisonTable.module.css';

const PLANS = ['Free', 'Day / Week pass', 'Unlimited', 'Lifetime'];

type Cell = boolean | string;

interface Row {
  label: string;
  values: [Cell, Cell, Cell, Cell];
}

interface Group {
  name: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    name: 'Conversion limits',
    rows: [
      {
        label: 'Cards per month',
        values: ['100', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
      {
        label: 'Conversions at once',
        values: ['1', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
      {
        label: 'PDF pages per file',
        values: ['100', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
      {
        label: 'Max upload size',
        values: ['100 MB', '10 GB', '10 GB', '10 GB'],
      },
      {
        label: 'Anki → Notion notes',
        values: ['1,000', '5,000', '5,000', '5,000'],
      },
    ],
  },
  {
    name: 'AI (Claude)',
    rows: [
      {
        label: 'AI flashcards from PDFs and docs',
        values: [false, true, true, true],
      },
      {
        label: 'Photo to deck (Claude Vision)',
        values: ['5 / mo', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
      {
        label: 'AI multiple choice (MCQ)',
        values: [false, true, true, true],
      },
      {
        label: 'AI card-template drafting',
        values: ['3', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
    ],
  },
  {
    name: 'Study tools',
    rows: [
      {
        label: 'Image occlusion',
        values: ['3 images', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
      {
        label: 'Mind maps',
        values: ['3', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
      {
        label: 'Prints to PDF',
        values: ['1 / mo', 'Unlimited', 'Unlimited', 'Unlimited'],
      },
    ],
  },
  {
    name: 'Sync & support',
    rows: [
      {
        label: 'Auto Sync from Notion',
        values: [false, false, false, true],
      },
      { label: 'Priority support', values: [false, false, true, true] },
    ],
  },
  {
    name: 'Billing',
    rows: [{ label: 'No subscription', values: [true, true, false, true] }],
  },
];

function CheckIcon() {
  return (
    <svg
      className={styles.check}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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

interface ComparisonTableProps {
  unlimitedMonthlyPrice: string;
}

export function ComparisonTable({
  unlimitedMonthlyPrice,
}: Readonly<ComparisonTableProps>) {
  const planPrices = [
    '$0',
    '$4 / $9',
    `${unlimitedMonthlyPrice} / mo`,
    'From $345',
  ];

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
                  <span className={styles.planPrice}>{planPrices[i]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group.name}>
                <tr className={styles.groupRow}>
                  <th
                    scope="colgroup"
                    colSpan={PLANS.length + 1}
                    className={styles.groupCell}
                  >
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
