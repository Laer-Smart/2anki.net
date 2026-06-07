import sharedStyles from '../../../styles/shared.module.css';
import FlashcardType from './FlashcardType';

interface RuleDefinitionProps {
  options: string[];
  value: string[];
  newOptions?: string[];
  labels?: Record<string, string>;
  onSelected: (value: string) => void;
}

export default function RuleDefinition({
  options,
  value,
  newOptions,
  labels,
  onSelected,
}: Readonly<RuleDefinitionProps>) {
  return (
    <div className={sharedStyles.flexWrap}>
      {options.map((fco) => (
        <FlashcardType
          key={fco}
          active={value.includes(fco)}
          name={fco}
          label={labels?.[fco]}
          isNew={newOptions?.includes(fco) ?? false}
          onSwitch={(name) => onSelected(name)}
        />
      ))}
    </div>
  );
}
