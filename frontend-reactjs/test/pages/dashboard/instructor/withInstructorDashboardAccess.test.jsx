import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';

import withInstructorDashboardAccess from '../../../../src/pages/dashboard/instructor/withInstructorDashboardAccess.jsx';

function renderWithOutlet(ui, contextValue) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Outlet context={contextValue} />}>
          <Route index element={ui} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('withInstructorDashboardAccess', () => {
  it('blocks access for non-instructor roles', () => {
    const Protected = withInstructorDashboardAccess(() => <div>secret</div>);

    renderWithOutlet(<Protected />, { role: 'learner' });

    expect(screen.getByText('Instructor Learnspace required')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders wrapped component for instructor roles', () => {
    const Protected = withInstructorDashboardAccess(() => <div>secret</div>);

    renderWithOutlet(<Protected />, { role: 'instructor' });

    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
