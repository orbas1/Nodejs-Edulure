import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';

import AdminPodcastManager from '../AdminPodcastManager.jsx';

const resourcePropsByTitle = new Map();

vi.mock('../AdminCrudResource.jsx', () => ({
  __esModule: true,
  default: vi.fn((props) => {
    resourcePropsByTitle.set(props.title, props);
    return (
      <div data-testid={`resource-${props.title}`}>
        <span>{props.description}</span>
      </div>
    );
  })
}));

const AdminCrudResourceMock = (await import('../AdminCrudResource.jsx')).default;

describe('AdminPodcastManager', () => {
  const api = {
    listPodcastShows: vi.fn(),
    createPodcastShow: vi.fn(),
    updatePodcastShow: vi.fn(),
    deletePodcastShow: vi.fn(),
    listPodcastEpisodes: vi.fn(),
    createPodcastEpisode: vi.fn(),
    updatePodcastEpisode: vi.fn(),
    deletePodcastEpisode: vi.fn()
  };

  beforeEach(() => {
    AdminCrudResourceMock.mockClear();
    resourcePropsByTitle.clear();
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  function renderManager() {
    render(<AdminPodcastManager token="token" api={api} />);
  }

  it('selects the first show when data arrives and updates episode descriptions', () => {
    renderManager();

    const showsProps = resourcePropsByTitle.get('Podcast Shows');
    act(() => {
      showsProps.onItemsChange([
        { id: 'show-1', title: 'Ops Control Tower' },
        { id: 'show-2', title: 'Creator Signals' }
      ]);
    });

    const episodesProps = resourcePropsByTitle.get('Podcast Episodes');
    expect(episodesProps.description).toContain('Ops Control Tower');
    expect(episodesProps.disabled).toBe(false);
  });

  it('routes API calls through the selected show and guards episode actions', async () => {
    renderManager();

    const episodesProps = resourcePropsByTitle.get('Podcast Episodes');

    expect(() =>
      episodesProps.createRequest({ token: 'token', payload: { title: 'Episode One' } })
    ).toThrow('Select a podcast show before creating episodes.');

    const showsProps = resourcePropsByTitle.get('Podcast Shows');
    act(() => {
      showsProps.onItemsChange([
        { id: 'show-9', title: 'Community Dispatch' }
      ]);
    });

    const refreshedEpisodesProps = resourcePropsByTitle.get('Podcast Episodes');

    api.createPodcastEpisode.mockResolvedValue({});
    await refreshedEpisodesProps.createRequest({ token: 'token', payload: { title: 'Launch Recap' } });

    expect(api.createPodcastEpisode).toHaveBeenCalledWith('show-9', {
      token: 'token',
      payload: { title: 'Launch Recap', showId: 'show-9' }
    });

    api.listPodcastEpisodes.mockResolvedValue({ data: [], meta: {} });
    await refreshedEpisodesProps.listRequest({ token: 'token', params: { status: 'draft' } });
    expect(api.listPodcastEpisodes).toHaveBeenCalledWith('show-9', {
      token: 'token',
      params: { status: 'draft' },
      signal: undefined
    });
  });
});
