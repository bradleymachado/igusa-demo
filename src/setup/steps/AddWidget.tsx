// AddWidget_v1.0 — This section is intended to render setup Step 3, "Add the widget": a static picture of the 364×170 medium widget built from the live draft events (colour tiles, no text) and the one-line instruction for adding it.
import type { EventDef } from '../../data'

export function AddWidget({ events, onContinue }: { events: EventDef[]; onContinue: () => void }) {
  return (
    <>
      <div className="setup-step" data-testid="setup-step-3">
        <h1 className="setup-headline">Add the widget</h1>
        <p className="setup-lede">Your events become tiles on the home screen. One tap logs one.</p>
        <div className="setup-widget" data-testid="widget-illustration" role="img" aria-label={`Medium widget with ${events.length} tiles`}>
          {events.map((e) => (
            <span key={e.id} className="setup-widget-tile" data-testid="widget-tile" style={{ background: e.color }} />
          ))}
        </div>
        <p className="setup-instruction">Press and hold the home screen, tap +, choose Igusa.</p>
      </div>
      <div className="setup-footer">
        <button type="button" className="setup-primary" aria-label="Continue to sample data" onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  )
}
