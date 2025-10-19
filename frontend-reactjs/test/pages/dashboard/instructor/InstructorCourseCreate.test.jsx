import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InstructorCourseCreate from '../../../../src/pages/dashboard/InstructorCourseCreate.jsx';

let contextValue;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => contextValue
  };
});

describe('InstructorCourseCreate', () => {
  const refresh = vi.fn();
  const generateCourseOutline = vi.fn().mockResolvedValue({ summary: 'Generated outline' });
  const importFromNotion = vi.fn().mockResolvedValue({ summary: 'Notion import queued' });
  const syncFromLms = vi.fn().mockResolvedValue({ summary: 'Sync started' });

  beforeEach(() => {
    refresh.mockClear();
    generateCourseOutline.mockClear();
    importFromNotion.mockClear();
    syncFromLms.mockClear();
    contextValue = {
      dashboard: {
        courses: {
          creationBlueprints: [
            {
              id: 'blueprint-1',
              title: 'Leadership Lab',
              moduleCount: 4,
              readiness: 70,
              outstanding: ['Publish intro', 'Review module 2']
            }
          ],
          lifecycle: []
        }
      },
      refresh,
      instructorOrchestration: {
        generateCourseOutline,
        importFromNotion,
        syncFromLms
      }
    };
  });

  it('orchestrates course outline and disables actions while pending', async () => {
    render(<InstructorCourseCreate />);

    const generateButton = screen.getByRole('button', { name: /generate outline/i });
    fireEvent.click(generateButton);

    expect(generateButton).toBeDisabled();
    await waitFor(() => expect(generateCourseOutline).toHaveBeenCalledTimes(1));
    expect(generateCourseOutline).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: 'blueprint-1', moduleCount: 4 })
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByText(/Course outline orchestration triggered/i)).toBeInTheDocument();
  });

  it('queues Notion import and LMS sync with feedback', async () => {
    render(<InstructorCourseCreate />);

    fireEvent.click(screen.getByRole('button', { name: /Import from Notion/i }));
    await waitFor(() => expect(importFromNotion).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText(/Notion import queued/i)[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sync from LMS/i }));
    await waitFor(() => expect(syncFromLms).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/LMS synchronisation started/i)).toBeInTheDocument();
  });
});
