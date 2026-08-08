import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WorkspaceNotepad } from '../components/workspace/WorkspaceShell';

/**
 * Le bloc-notes n'a pas de bouton « Enregistrer » : s'il n'écrit pas, rien ne
 * le signale à l'écran et la note est perdue au rechargement. Ces tests
 * verrouillent le contrat d'enregistrement.
 */

/** Magasin clé/valeur en mémoire, à l'image du magasin `settings`. */
function fakeStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    load: vi.fn(async (k: string) => (k in data ? data[k] : null)),
    save: vi.fn(async (k: string, v: string) => { data[k] = v; }),
  };
}

const type = async (el: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('WorkspaceNotepad — enregistrement du bloc-notes', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('relit la note déjà enregistrée au montage', async () => {
    const store = fakeStore({ 'workspace_notes_comptable_u1': 'Relancer le client BRIDGE' });
    render(<WorkspaceNotepad storageKey="workspace_notes_comptable_u1" load={store.load} save={store.save} />);

    const zone = await screen.findByLabelText<HTMLTextAreaElement>("Bloc-notes de l'espace de travail");
    await waitFor(() => expect(zone.value).toBe('Relancer le client BRIDGE'));
    expect(store.load).toHaveBeenCalledWith('workspace_notes_comptable_u1');
  });

  it("n'écrit rien au montage : afficher une note n'est pas la modifier", async () => {
    const store = fakeStore({ k: 'note existante' });
    render(<WorkspaceNotepad storageKey="k" load={store.load} save={store.save} />);
    await screen.findByLabelText("Bloc-notes de l'espace de travail");

    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(store.save).not.toHaveBeenCalled();
  });

  it('enregistre une seconde après la dernière frappe', async () => {
    const store = fakeStore();
    render(<WorkspaceNotepad storageKey="k" load={store.load} save={store.save} />);
    const zone = await screen.findByLabelText<HTMLTextAreaElement>("Bloc-notes de l'espace de travail");

    await act(async () => { await type(zone, 'Point de TVA à vérifier'); });
    expect(store.save).not.toHaveBeenCalled();          // pas d'écriture à chaque touche

    await act(async () => { vi.advanceTimersByTime(1000); });
    await waitFor(() => expect(store.save).toHaveBeenCalledWith('k', 'Point de TVA à vérifier'));
    expect(store.data.k).toBe('Point de TVA à vérifier');
  });

  it('ne garde que la dernière valeur quand on écrit sans pause', async () => {
    const store = fakeStore();
    render(<WorkspaceNotepad storageKey="k" load={store.load} save={store.save} />);
    const zone = await screen.findByLabelText<HTMLTextAreaElement>("Bloc-notes de l'espace de travail");

    await act(async () => { await type(zone, 'a'); vi.advanceTimersByTime(300); });
    await act(async () => { await type(zone, 'ab'); vi.advanceTimersByTime(300); });
    await act(async () => { await type(zone, 'abc'); vi.advanceTimersByTime(1000); });

    await waitFor(() => expect(store.save).toHaveBeenCalledTimes(1));
    expect(store.save).toHaveBeenCalledWith('k', 'abc');
  });

  it("sauvegarde la dernière frappe si l'on quitte l'écran avant l'échéance", async () => {
    const store = fakeStore();
    const view = render(<WorkspaceNotepad storageKey="k" load={store.load} save={store.save} />);
    const zone = await screen.findByLabelText<HTMLTextAreaElement>("Bloc-notes de l'espace de travail");

    await act(async () => { await type(zone, 'note écrite juste avant de partir'); });
    await act(async () => { view.unmount(); });

    await waitFor(() => expect(store.save).toHaveBeenCalledWith('k', 'note écrite juste avant de partir'));
  });

  it("confirme l'enregistrement à l'écran", async () => {
    const store = fakeStore();
    render(<WorkspaceNotepad storageKey="k" load={store.load} save={store.save} />);
    const zone = await screen.findByLabelText<HTMLTextAreaElement>("Bloc-notes de l'espace de travail");

    await act(async () => { await type(zone, 'ok'); vi.advanceTimersByTime(1000); });
    await waitFor(() => expect(screen.getByText(/Enregistré à/)).toBeTruthy());
  });

  it('reste utilisable si la lecture échoue (première ouverture, magasin vide)', async () => {
    const store = fakeStore();
    store.load.mockRejectedValueOnce(new Error('indisponible'));
    render(<WorkspaceNotepad storageKey="k" load={store.load} save={store.save} />);

    const zone = await screen.findByLabelText<HTMLTextAreaElement>("Bloc-notes de l'espace de travail");
    await waitFor(() => expect(zone.disabled).toBe(false));

    await act(async () => { await type(zone, 'première note'); vi.advanceTimersByTime(1000); });
    await waitFor(() => expect(store.save).toHaveBeenCalledWith('k', 'première note'));
  });
});
