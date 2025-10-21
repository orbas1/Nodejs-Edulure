import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProfileIdentityEditor from '../ProfileIdentityEditor.jsx';

const baseForm = {
  firstName: 'Jamie',
  lastName: 'Lee',
  displayName: 'Jamie Lee',
  tagline: 'Designing playful journeys',
  location: 'Remote',
  bio: 'I run cosy design cohorts.',
  avatarUrl: 'https://cdn.example.com/avatar.png',
  bannerUrl: '',
  socialLinks: [
    { label: 'Website', url: 'https://jamie.co' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/jamie' }
  ],
  address: {
    city: 'Lisbon',
    region: 'Lisbon',
    country: 'Portugal',
    postalCode: '1000-100'
  }
};

const createHandlerMocks = () => ({
  onFieldChange: vi.fn(),
  onAddressChange: vi.fn(),
  onSocialLinkChange: vi.fn(),
  onAddSocialLink: vi.fn(),
  onRemoveSocialLink: vi.fn(),
  onSubmit: vi.fn()
});

function renderEditor(handlers, overrides = {}) {
  const initialSocialLinks = overrides.socialLinks ?? baseForm.socialLinks;
  let form = {
    ...baseForm,
    ...overrides,
    address: { ...baseForm.address, ...overrides.address },
    socialLinks: initialSocialLinks.map((link) => ({ ...link }))
  };

  let renderApi;

  const updateAndRerender = (nextForm) => {
    form = nextForm;
    renderApi.rerender(getComponent());
  };

  const getComponent = () => (
    <ProfileIdentityEditor
      form={form}
      canSubmit
      onFieldChange={(field, value) => {
        handlers.onFieldChange(field, value);
        updateAndRerender({ ...form, [field]: value });
      }}
      onAddressChange={(field, value) => {
        handlers.onAddressChange(field, value);
        updateAndRerender({
          ...form,
          address: { ...form.address, [field]: value }
        });
      }}
      onSocialLinkChange={(index, value) => {
        handlers.onSocialLinkChange(index, value);
        updateAndRerender({
          ...form,
          socialLinks: form.socialLinks.map((link, linkIndex) =>
            linkIndex === index ? value : link
          )
        });
      }}
      onAddSocialLink={() => {
        handlers.onAddSocialLink();
        updateAndRerender({
          ...form,
          socialLinks: [...form.socialLinks, { label: '', url: '' }]
        });
      }}
      onRemoveSocialLink={(index) => {
        handlers.onRemoveSocialLink(index);
        updateAndRerender({
          ...form,
          socialLinks: form.socialLinks.filter((_, linkIndex) => linkIndex !== index)
        });
      }}
      onSubmit={() => handlers.onSubmit()}
    />
  );

  renderApi = render(getComponent());
  return renderApi;
}

describe('ProfileIdentityEditor', () => {
  it('wires field and address changes to the provided callbacks', async () => {
    const user = userEvent.setup();
    const handlers = createHandlerMocks();
    renderEditor(handlers);

    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.type(displayNameInput, 'Z');
    const displayNameCalls = handlers.onFieldChange.mock.calls.filter((call) => call[0] === 'displayName');
    expect(displayNameCalls.at(-1)[1]).toBe('Jamie LeeZ');

    const cityInput = screen.getByLabelText(/^city$/i);
    await user.clear(cityInput);
    await user.type(cityInput, 'Lisbon Hub');
    const lastCityCall = handlers.onAddressChange.mock.calls.findLast((call) => call[0] === 'city');
    expect(lastCityCall[1]).toBe('Lisbon Hub');
  });

  it('supports managing social links and submission state', async () => {
    const user = userEvent.setup();
    const handlers = createHandlerMocks();
    renderEditor(handlers);

    await user.click(screen.getByRole('button', { name: /add link/i }));
    expect(handlers.onAddSocialLink).toHaveBeenCalled();

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons.at(-1));
    expect(handlers.onRemoveSocialLink).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /save profile/i }));
    expect(handlers.onSubmit).toHaveBeenCalled();
  });
});
