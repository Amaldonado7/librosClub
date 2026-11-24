import type { GiftAnswers, GiftField, GiftProfile } from '@/lib/gift-contract';

export interface GiftOption<F extends GiftField = GiftField> {
  label: string;
  value: GiftAnswers[F];
}

export interface GiftQuestionData<F extends GiftField = GiftField> {
  field: F;
  prompt: string;
  options: GiftOption<F>[];
}

type GiftQuestionList = { [F in GiftField]: GiftQuestionData<F> }[GiftField][];

export const GIFT_QUESTIONS: GiftQuestionList = [
  {
    field: 'relationship',
    prompt: '¿Para quién es el regalo?',
    options: [
      { label: 'Mi mamá', value: 'mama' },
      { label: 'Mi papá', value: 'papa' },
      { label: 'Mi pareja', value: 'pareja' },
      { label: 'Un amigo o amiga', value: 'amigo' },
      { label: 'Mi hermano o hermana', value: 'hermano' },
      { label: 'Mi hijo o hija', value: 'hijo' },
      { label: 'Otra persona', value: 'otro' },
    ],
  },
  {
    field: 'occasion',
    prompt: '¿Para qué ocasión?',
    options: [
      { label: 'Cumpleaños', value: 'cumpleanos' },
      { label: 'Navidad', value: 'navidad' },
      { label: 'Día de la madre o del padre', value: 'dia_madre_padre' },
      { label: 'Aniversario', value: 'aniversario' },
      { label: 'Porque sí', value: 'porque_si' },
    ],
  },
  {
    field: 'age',
    prompt: '¿Qué edad tiene?',
    options: [
      { label: 'Entre 18 y 30', value: 'joven' },
      { label: 'Entre 31 y 60', value: 'adulto' },
    ],
  },
  {
    field: 'readingLevel',
    prompt: '¿Cuánto lee?',
    options: [
      { label: 'Casi nunca', value: 'casi_nunca' },
      { label: 'Solo en vacaciones', value: 'vacaciones' },
      { label: 'Un libro por mes', value: 'mensual' },
      { label: 'Devora libros', value: 'devora' },
    ],
  },
  {
    field: 'hook',
    prompt: '¿Qué le engancha más de una historia?',
    options: [
      { label: 'Que los personajes se enamoren', value: 'amor' },
      { label: 'Descubrir quién fue', value: 'misterio' },
      { label: 'Reírse y pasarla bien', value: 'humor' },
      { label: 'Es fan del anime y el manga', value: 'anime_manga' },
    ],
  },
  {
    field: 'kind',
    prompt: '¿Ficción o realidad?',
    options: [
      { label: 'Novelas', value: 'novela' },
      { label: 'Historias reales', value: 'historia_real' },
      { label: 'Aprender algo nuevo', value: 'aprender' },
      { label: 'Poesía', value: 'poesia' },
    ],
  },
  {
    field: 'length',
    prompt: '¿Qué largo prefiere?',
    options: [
      { label: 'Cortito', value: 'corto' },
      { label: 'Ni muy corto ni muy largo', value: 'mediano' },
      { label: 'Le da igual', value: 'indistinto' },
    ],
  },
  {
    field: 'tone',
    prompt: '¿Qué tono busca?',
    options: [
      { label: 'Liviano, para pasarla bien', value: 'liviano' },
      { label: 'Emotivo, que lo toque', value: 'emotivo' },
      { label: 'Intenso, que no pueda soltarlo', value: 'intenso' },
    ],
  },
];

export interface Recipient {
  recipient: string;
  heading: string;
}

export const RECIPIENTS: Record<GiftAnswers['relationship'], Recipient> = {
  mama: { recipient: 'tu mamá', heading: 'MAMÁ' },
  papa: { recipient: 'tu papá', heading: 'PAPÁ' },
  pareja: { recipient: 'tu pareja', heading: 'TU PAREJA' },
  amigo: { recipient: 'tu amigo o amiga', heading: 'TU AMIGO O AMIGA' },
  hermano: { recipient: 'tu hermano o hermana', heading: 'TU HERMANO O HERMANA' },
  hijo: { recipient: 'tu hijo o hija', heading: 'TU HIJO O HIJA' },
  otro: { recipient: 'esa persona', heading: 'ALGUIEN ESPECIAL' },
};

const recipientEntry = (relationship: string): Recipient =>
  Object.prototype.hasOwnProperty.call(RECIPIENTS, relationship)
    ? RECIPIENTS[relationship as GiftAnswers['relationship']]
    : RECIPIENTS.otro;

export function recipientFor(relationship: string): string {
  return recipientEntry(relationship).recipient;
}

const OCCASION_QUESTION = GIFT_QUESTIONS.find((question) => question.field === 'occasion');

export function occasionHeading(occasion: string): string | null {
  const option = OCCASION_QUESTION?.options.find((candidate) => candidate.value === occasion);
  return option ? option.label.toLocaleUpperCase('es-AR') : null;
}

export function resultHeading(profile: GiftProfile): string {
  const heading = `PARA ${recipientEntry(profile.relationship).heading}`;
  const occasion = occasionHeading(profile.occasion);
  return occasion ? `${heading} · ${occasion}` : heading;
}
