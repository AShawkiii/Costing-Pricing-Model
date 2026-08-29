/**
 * Numeric input with a local text buffer.
 *
 * Keeping the raw string locally lets the user type "2.", "0.5" or clear the
 * field without the value jumping around, while the parent always receives a
 * clean number. Invalid input never reaches the calculation engine.
 */

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  ariaLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  /** Renders a static suffix (e.g. EGP or %) attached to the field. */
  suffix?: string;
  align?: 'left' | 'right';
}

function toText(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 'any' as unknown as number,
  placeholder,
  ariaLabel,
  invalid,
  disabled,
  id,
  suffix,
  align = 'right',
}: Props) {
  const [text, setText] = useState(() => toText(value));
  const focused = useRef(false);

  // Keep in sync when the value changes from outside (reset, duplicate, load).
  useEffect(() => {
    if (!focused.current && Number(text) !== value) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw.trim() === '') {
      onChange(0);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onChange(parsed);
  };

  const input = (
    <input
      id={id}
      className={[
        'input',
        align === 'right' ? 'input--numeric' : '',
        invalid ? 'input--invalid' : '',
      ].join(' ')}
      type="number"
      inputMode="decimal"
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        setText(toText(value));
      }}
      onChange={(e) => handleChange(e.target.value)}
    />
  );

  if (!suffix) return input;
  return (
    <div className="input-group">
      {input}
      <span className="input-group__suffix">{suffix}</span>
    </div>
  );
}

/**
 * Percentage input. The model stores fractions (0.14), the user types whole
 * percentages (14) — the conversion lives here so the engine never sees "14%".
 */
export function PercentInput({
  value,
  onChange,
  ...rest
}: Omit<Props, 'value' | 'onChange' | 'suffix'> & {
  value: number;
  onChange: (fraction: number) => void;
}) {
  return (
    <NumericInput
      {...rest}
      suffix="%"
      value={Number((value * 100).toFixed(4))}
      onChange={(pct) => onChange(pct / 100)}
    />
  );
}
