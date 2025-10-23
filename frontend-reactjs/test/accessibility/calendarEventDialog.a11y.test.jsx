import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import CalendarEventDialog from '../../src/components/calendar/CalendarEventDialog.jsx';

describe('CalendarEventDialog accessibility', () => {
  it('has no detectable accessibility violations when open', async () => {
    const { container } = render(
      <CalendarEventDialog
        isOpen
        mode="create"
        initialData={{
          title: 'Revenue workshop',
          startAt: '2025-01-01T12:00',
          endAt: '2025-01-01T13:00'
        }}
        onSubmit={() => {}}
        onClose={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
