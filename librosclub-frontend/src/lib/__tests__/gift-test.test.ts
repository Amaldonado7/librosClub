import { describe, it, expect } from 'vitest';
import { ANSWER_VALUES } from '@/lib/gift-contract';
import { GIFT_QUESTIONS, RECIPIENTS, occasionHeading, recipientFor, resultHeading, storyHeading } from '@/lib/gift-test';

describe('GIFT_QUESTIONS', () => {
  it('tiene las 8 preguntas en el orden de campos del contrato', () => {
    expect(GIFT_QUESTIONS.map((question) => question.field)).toEqual([
      'relationship',
      'occasion',
      'age',
      'readingLevel',
      'hook',
      'kind',
      'length',
      'tone',
    ]);
  });

  it('los valores de cada pregunta son exactamente ANSWER_VALUES en el mismo orden', () => {
    for (const question of GIFT_QUESTIONS) {
      expect(question.options.map((option) => option.value)).toEqual([...ANSWER_VALUES[question.field]]);
    }
  });

  it('la pregunta de edad solo ofrece los dos rangos', () => {
    const age = GIFT_QUESTIONS[2];
    expect(age.options).toEqual([
      { label: 'Entre 18 y 30', value: 'joven' },
      { label: 'Entre 31 y 60', value: 'adulto' },
    ]);
  });
});

describe('destinatario y encabezado', () => {
  it.each([
    ['mama', 'tu mamá'],
    ['papa', 'tu papá'],
    ['pareja', 'tu pareja'],
    ['amigo', 'tu amigo o amiga'],
    ['hermano', 'tu hermano o hermana'],
    ['hijo', 'tu hijo o hija'],
    ['otro', 'esa persona'],
    ['desconocido', 'esa persona'],
    ['toString', 'esa persona'],
  ])('recipientFor(%s) === %s', (relationship, expected) => {
    expect(recipientFor(relationship)).toBe(expected);
  });

  it('resultHeading combina vínculo y ocasión', () => {
    expect(resultHeading({ relationship: 'mama', occasion: 'navidad' })).toBe('PARA MAMÁ · NAVIDAD');
    expect(resultHeading({ relationship: 'pareja', occasion: 'aniversario' })).toBe('PARA TU PAREJA · ANIVERSARIO');
  });

  it('occasionHeading usa el texto visible en mayúsculas', () => {
    expect(occasionHeading('dia_madre_padre')).toBe('DÍA DE LA MADRE O DEL PADRE');
    expect(occasionHeading('porque_si')).toBe('PORQUE SÍ');
    expect(occasionHeading('cumpleanos')).toBe('CUMPLEAÑOS');
  });

  it('vínculo desconocido cae en ALGUIEN ESPECIAL y ocasión desconocida se omite', () => {
    expect(resultHeading({ relationship: 'vecino', occasion: 'navidad' })).toBe('PARA ALGUIEN ESPECIAL · NAVIDAD');
    expect(resultHeading({ relationship: 'mama', occasion: 'graduacion' })).toBe('PARA MAMÁ');
    expect(occasionHeading('graduacion')).toBeNull();
  });
});

describe('storyHeading', () => {
  it.each([
    ['mama', 'MI REGALO PARA MAMÁ'],
    ['papa', 'MI REGALO PARA PAPÁ'],
    ['pareja', 'MI REGALO PARA MI PAREJA'],
    ['amigo', 'MI REGALO PARA MI AMIGO O AMIGA'],
    ['hermano', 'MI REGALO PARA MI HERMANO O HERMANA'],
    ['hijo', 'MI REGALO PARA MI HIJO O HIJA'],
    ['otro', 'MI REGALO PARA ALGUIEN ESPECIAL'],
    ['desconocido', 'MI REGALO PARA ALGUIEN ESPECIAL'],
    ['__proto__', 'MI REGALO PARA ALGUIEN ESPECIAL'],
  ])('%s → %s', (relationship, expected) => {
    expect(storyHeading(relationship)).toBe(expected);
  });

  it('cada vínculo tiene su texto para la placa', () => {
    for (const entry of Object.values(RECIPIENTS)) {
      expect(entry.story).toMatch(/^[A-ZÁÉÍÓÚ ]+$/);
    }
  });
});
