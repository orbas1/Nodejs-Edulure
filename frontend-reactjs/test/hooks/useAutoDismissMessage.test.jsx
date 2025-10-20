import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { vi } from 'vitest';

import useAutoDismissMessage from '../../src/hooks/useAutoDismissMessage.js';

function TestHarness({ initialMessage = '', timeout = 1000 }) {
  const [message, setMessage] = useState(initialMessage);

  useAutoDismissMessage(message, () => {
    setMessage('');
  }, { timeout });

  return (
    <div>
      <p data-testid="message">{message}</p>
      <button type="button" onClick={() => setMessage('updated')}>
        Trigger message
      </button>
    </div>
  );
}

describe('useAutoDismissMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('clears the message after the timeout elapses', () => {
    render(<TestHarness initialMessage="Hello" timeout={500} />);

    expect(screen.getByTestId('message').textContent).toBe('Hello');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId('message').textContent).toBe('');
  });

  it('restarts the timer when the message changes', () => {
    render(<TestHarness timeout={800} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /trigger message/i }));
    });

    expect(screen.getByTestId('message').textContent).toBe('updated');

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('message').textContent).toBe('updated');

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('message').textContent).toBe('');
  });

  it('does not throw if no clear handler is provided', () => {
    function NoopHandler() {
      const [message, setMessage] = useState('hello');
      useAutoDismissMessage(message, undefined, { timeout: 200 });
      return (
        <button type="button" onClick={() => setMessage('next')}>
          update
        </button>
      );
    }

    expect(() => render(<NoopHandler />)).not.toThrow();
  });
});
