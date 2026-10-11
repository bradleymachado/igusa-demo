// SampleData_v1.0 — This section is intended to render setup Step 4, "Start with sample data?": the sample-data option (preselected; hidden for the blank template) and "Start empty", then Done.
interface Props {
  allowSample: boolean
  withSample: boolean
  onSelect: (withSample: boolean) => void
  onDone: () => void
}

interface Option {
  value: boolean
  label: string
  title: string
  note: string
}

export function SampleData({ allowSample, withSample, onSelect, onDone }: Props) {
  const options: Option[] = [
    ...(allowSample
      ? [{ value: true, label: 'Sample data', title: 'Fill with 6 months of sample data', note: 'See the grid and patterns right away.' }]
      : []),
    { value: false, label: 'Start empty', title: 'Start empty', note: 'Begin logging from today.' },
  ]
  return (
    <>
      <div className="setup-step" data-testid="setup-step-4">
        <h1 className="setup-headline">Start with sample data?</h1>
        <p className="setup-lede">Sample data is made up. Reset the demo at any time.</p>
        <div className="setup-options" role="radiogroup" aria-label="Starting data">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              className="setup-option"
              aria-checked={withSample === o.value}
              aria-label={o.label}
              onClick={() => onSelect(o.value)}
            >
              <span className="setup-radio" aria-hidden="true" />
              <span className="setup-row-text">
                <span className="setup-row-name">{o.title}</span>
                <span className="setup-row-note">{o.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="setup-footer">
        <button type="button" className="setup-primary" aria-label="Done" onClick={onDone}>
          Done
        </button>
      </div>
    </>
  )
}
