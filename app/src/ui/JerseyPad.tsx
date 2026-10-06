interface Props {
  numbers: number[];
  selected: number | null;
  onSelect: (n: number | null) => void;
  allowCustom?: boolean;
}

export function JerseyPad({ numbers, selected, onSelect, allowCustom = true }: Props) {
  const custom = () => {
    const v = prompt('Numero di maglia');
    if (v && /^\d+$/.test(v.trim())) onSelect(Number(v.trim()));
  };
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  return (
    <div class="jersey-pad">
      <button class={`chip${selected === null ? ' active' : ''}`} onClick={() => onSelect(null)}>Squadra</button>
      {sorted.map((n) => (
        <button key={n} class={`chip${selected === n ? ' active' : ''}`} onClick={() => onSelect(selected === n ? null : n)}>#{n}</button>
      ))}
      {allowCustom && <button class="chip" onClick={custom}>N.…</button>}
    </div>
  );
}
