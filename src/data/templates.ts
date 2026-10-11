// Templates_v1.0 — This section is intended to define the six condition templates (five conditions plus Start blank): their events with palette colours in assignment order, one-line blurbs, and the exposure→symptom patterns the sample-data generator plants.
import type { EventDef, EventKind, Template } from './types.ts'

/** Event palette in assignment order (Build Plan §2). Patina is the brand colour and is never used here. */
export const PALETTE = ['#B5462F', '#3F6694', '#C08A2E', '#7A4E82', '#5E7F3A'] as const

type Spec = [id: string, name: string, kind: EventKind, askSeverity: boolean]

function events(specs: Spec[]): EventDef[] {
  return specs.map(([id, name, kind, askSeverity], i) => ({
    id,
    name,
    color: PALETTE[i],
    kind,
    askSeverity,
  }))
}

export const TEMPLATES: Template[] = [
  {
    id: 'ibs',
    name: 'IBS',
    blurb: 'Track bloating and cramping alongside dairy, fried food and caffeine to see what tends to follow what.',
    events: events([
      ['ibs-bloating', 'Bloating', 'symptom', true],
      ['ibs-cramping', 'Cramping', 'symptom', true],
      ['ibs-dairy', 'Dairy', 'exposure', false],
      ['ibs-fried-food', 'Fried food', 'exposure', false],
      ['ibs-caffeine', 'Caffeine', 'exposure', false],
    ]),
    patterns: [
      { exposureId: 'ibs-dairy', symptomId: 'ibs-bloating', targetLift: 2.8 },
      { exposureId: 'ibs-fried-food', symptomId: 'ibs-cramping', targetLift: 2.2 },
      { exposureId: 'ibs-caffeine', symptomId: 'ibs-bloating', targetLift: 1.6 },
    ],
  },
  {
    id: 'migraine',
    name: 'Migraine',
    blurb: 'Log headaches and aura next to short sleep, alcohol and skipped meals, then look back at the pattern.',
    events: events([
      ['migraine-headache', 'Headache', 'symptom', true],
      ['migraine-aura', 'Aura', 'symptom', false],
      ['migraine-short-sleep', 'Short sleep', 'exposure', false],
      ['migraine-alcohol', 'Alcohol', 'exposure', false],
      ['migraine-skipped-meal', 'Skipped meal', 'exposure', false],
    ]),
    patterns: [
      { exposureId: 'migraine-short-sleep', symptomId: 'migraine-headache', targetLift: 2.6 },
      { exposureId: 'migraine-alcohol', symptomId: 'migraine-headache', targetLift: 2.1 },
      { exposureId: 'migraine-skipped-meal', symptomId: 'migraine-aura', targetLift: 1.7 },
    ],
  },
  {
    id: 'heartburn-gerd',
    name: 'Heartburn/GERD',
    blurb: 'Note heartburn and regurgitation with fried food, late meals and coffee, and watch how they line up.',
    events: events([
      ['gerd-heartburn', 'Heartburn', 'symptom', true],
      ['gerd-regurgitation', 'Regurgitation', 'symptom', false],
      ['gerd-fried-food', 'Fried food', 'exposure', false],
      ['gerd-late-meal', 'Late meal', 'exposure', false],
      ['gerd-coffee', 'Coffee', 'exposure', false],
    ]),
    patterns: [
      { exposureId: 'gerd-fried-food', symptomId: 'gerd-heartburn', targetLift: 3.0 },
      { exposureId: 'gerd-late-meal', symptomId: 'gerd-heartburn', targetLift: 2.3 },
      { exposureId: 'gerd-coffee', symptomId: 'gerd-regurgitation', targetLift: 1.6 },
    ],
  },
  {
    id: 'food-allergy',
    name: 'Food allergy',
    blurb: 'Record reactions and itching together with eating out, new foods and packaged snacks.',
    events: events([
      ['allergy-reaction', 'Reaction', 'symptom', true],
      ['allergy-itching', 'Itching', 'symptom', true],
      ['allergy-ate-out', 'Ate out', 'exposure', false],
      ['allergy-new-food', 'New food', 'exposure', false],
      ['allergy-packaged-snack', 'Packaged snack', 'exposure', false],
    ]),
    patterns: [
      { exposureId: 'allergy-ate-out', symptomId: 'allergy-reaction', targetLift: 2.7 },
      { exposureId: 'allergy-new-food', symptomId: 'allergy-itching', targetLift: 2.0 },
      { exposureId: 'allergy-packaged-snack', symptomId: 'allergy-reaction', targetLift: 1.6 },
    ],
  },
  {
    id: 'hives-eczema',
    name: 'Hives/eczema',
    blurb: 'Keep tabs on flares and itch alongside heat, stress and wool or fragrance, day by day.',
    events: events([
      ['hives-flare', 'Flare', 'symptom', true],
      ['hives-itch', 'Itch', 'symptom', true],
      ['hives-heat-sweat', 'Heat/sweat', 'exposure', false],
      ['hives-stress', 'Stress', 'exposure', false],
      ['hives-wool-fragrance', 'Wool/fragrance', 'exposure', false],
    ]),
    patterns: [
      { exposureId: 'hives-heat-sweat', symptomId: 'hives-flare', targetLift: 2.5 },
      { exposureId: 'hives-wool-fragrance', symptomId: 'hives-itch', targetLift: 2.4 },
      { exposureId: 'hives-stress', symptomId: 'hives-flare', targetLift: 1.7 },
    ],
  },
  {
    id: 'blank',
    name: 'Start blank',
    blurb: 'Add your own symptoms and exposures and build the list that fits you.',
    events: [],
    patterns: [],
  },
]

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
