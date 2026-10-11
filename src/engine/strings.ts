// Strings_v1.0 — This section is intended to hold every user-facing Weave sentence so wording stays association-only and is checked in one place.

/** "{Symptom} followed {exposure} {lift}× more often." — the only pattern sentence the demo shows. */
export function pairText(symptomName: string, exposureName: string, lift: number): string {
  return `${symptomName} followed ${exposureName} ${lift.toFixed(1)}× more often.`
}

/**
 * Teaser shown while a pair is below the data thresholds.
 * "2 more exposures needed · 1 more symptom entry needed"; either half is dropped when its need is 0.
 */
export function teaserText(exposuresNeeded: number, symptomsNeeded: number): string {
  const parts: string[] = []
  if (exposuresNeeded > 0) {
    parts.push(`${exposuresNeeded} more ${exposuresNeeded === 1 ? 'exposure' : 'exposures'} needed`)
  }
  if (symptomsNeeded > 0) {
    parts.push(`${symptomsNeeded} more ${symptomsNeeded === 1 ? 'symptom entry' : 'symptom entries'} needed`)
  }
  return parts.join(' · ')
}
