import { it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/preact';
import { FoulChooser } from '../src/ui/FoulChooser';

afterEach(cleanup);

it('mostra i tipi di fallo FIBA 2026 con sigla e note; scelta del giocatore per i falli da giocatore', () => {
  const onPlayer = vi.fn(); const onCoach = vi.fn();
  render(<FoulChooser side="US" onPlayerFoul={onPlayer} onCoachFoul={onCoach} onClose={() => undefined} />);
  for (const t of ['Personale', 'In attacco', 'Disruptive', 'Flagrante', 'Tecnico cat. 1', 'Tecnico cat. 2', 'Da espulsione', 'Tecnico allenatore', 'Tecnico panchina']) {
    expect(screen.getByRole('button', { name: new RegExp(t) })).toBeTruthy();
  }
  expect(screen.queryByRole('button', { name: /Antisportivo/ })).toBeNull();
  expect(screen.getByRole('button', { name: /Flagrante/ }).textContent).toContain("conta per l'espulsione");
  fireEvent.click(screen.getByRole('button', { name: /Disruptive/ }));
  expect(onPlayer).toHaveBeenCalledWith('DISRUPTIVE');
  fireEvent.click(screen.getByRole('button', { name: /Tecnico allenatore/ }));
  expect(onCoach).toHaveBeenCalledWith('COACH_TECHNICAL');
});
