import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RegaloPage from '../RegaloPage';

const mocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
}));

vi.mock('@/utils/api', () => ({
  ApiError: class ApiError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
  giftAPI: { getRecommendations: mocks.getRecommendations },
}));

const renderPage = () => render(<RegaloPage />);

const choose = (label: string) => {
  fireEvent.click(screen.getByRole('radio', { name: label }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
};

const start = () => fireEvent.click(screen.getByRole('button', { name: 'Empezar el test' }));

describe('RegaloPage — inicio y preguntas', () => {
  it('renderiza el inicio con los textos exactos', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'El libro justo para cada persona' })).toBeInTheDocument();
    expect(
      screen.getByText('Contanos cómo es quien recibe el regalo y te elegimos tres libros que se consiguen en Argentina.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar el test' })).toHaveClass('h-14');
    expect(screen.getByText('8 preguntas · menos de 2 minutos')).toBeInTheDocument();
  });

  it('al volver al inicio y empezar de nuevo, la pregunta 1 no tiene selección', () => {
    renderPage();
    start();
    choose('Mi mamá');
    choose('Navidad');
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('radio', { name: 'Mi mamá' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    start();
    expect(screen.getByText('PREGUNTA 1 DE 8')).toBeInTheDocument();
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
  });

  it('Volver conserva la respuesta de la pregunta anterior', () => {
    renderPage();
    start();
    choose('Mi mamá');
    choose('Navidad');
    choose('Entre 31 y 60');
    expect(screen.getByText('pensá en tu mamá…')).toBeInTheDocument();
    choose('Un libro por mes');
    expect(screen.getByText('PREGUNTA 5 DE 8')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByText('PREGUNTA 4 DE 8')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Un libro por mes' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Volver en la pregunta 1 muestra el inicio', () => {
    renderPage();
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('heading', { name: 'El libro justo para cada persona' })).toBeInTheDocument();
  });

  it('el foco pasa al enunciado de cada pregunta y los controles son botones nativos', () => {
    renderPage();
    start();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: '¿Para quién es el regalo?' }));
    choose('Mi papá');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: '¿Para qué ocasión?' }));

    const controls = [
      ...screen.getAllByRole('radio'),
      screen.getByRole('button', { name: 'Siguiente' }),
      screen.getByRole('button', { name: 'Volver' }),
    ];
    controls.forEach((control) => {
      expect(control.tagName).toBe('BUTTON');
      expect(control.getAttribute('tabindex')).toBeNull();
    });
  });

  it('el contenedor principal se centra con ancho máximo de 480 px', () => {
    renderPage();
    expect(screen.getByRole('main')).toHaveClass('max-w-[480px]', 'w-full', 'mx-auto');
  });

  it('el inicio tiene fondo oliva, logo de 250 px y la acción a todo el ancho', () => {
    const { container } = renderPage();
    const page = container.querySelector('[data-screen]');
    expect(page).toHaveAttribute('data-screen', 'intro');
    expect(page).toHaveClass('bg-forest', 'text-warm-cream');
    expect(screen.getByRole('main')).toHaveClass('bg-forest');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('font-serif', 'text-[40px]');
    expect(screen.getByRole('button', { name: 'Empezar el test' })).toHaveClass('bg-terracotta', 'h-14', 'w-full');
    expect(screen.getByRole('img', { name: 'LibrosClub' })).toHaveAttribute('width', '250');
    expect(screen.getByText('Regalá un libro')).toBeInTheDocument();
    expect(screen.getByText('hola libro nuevo')).toHaveClass('text-sunlight');
    expect(screen.getByText('Olor a libro nuevo')).toHaveClass('pill-sun');
  });

  it('al empezar el test el fondo pasa a crema', () => {
    const { container } = renderPage();
    start();
    const page = container.querySelector('[data-screen]');
    expect(page).toHaveAttribute('data-screen', 'question');
    expect(page).toHaveClass('bg-warm-cream', 'text-wood-dark');
    expect(screen.getByRole('main')).toHaveClass('bg-warm-cream');
  });
});
