import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotifications } from '../NotificationProvider';

// Test component that uses notifications
const TestComponent = () => {
  const { showSuccess, showError, showWarning, showInfo, clearAllNotifications } = useNotifications();

  return (
    <div>
      <button onClick={() => showSuccess('Success message', 'Success')}>Show Success</button>
      <button onClick={() => showError('Error message', 'Error')}>Show Error</button>
      <button onClick={() => showWarning('Warning message', 'Warning')}>Show Warning</button>
      <button onClick={() => showInfo('Info message', 'Info')}>Show Info</button>
      <button onClick={clearAllNotifications}>Clear All</button>
    </div>
  );
};

describe('NotificationProvider', () => {
  test('renders children correctly', () => {
    render(
      <NotificationProvider>
        <div data-testid="child">Test Child</div>
      </NotificationProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('shows success notification when triggered', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await act(async () => {
      userEvent.click(screen.getByText('Show Success'));
    });

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  test('shows error notification when triggered', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await act(async () => {
      userEvent.click(screen.getByText('Show Error'));
    });

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  test('removes notifications when dismissed', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await act(async () => {
      userEvent.click(screen.getByText('Show Info'));
    });

    expect(screen.getByText('Info')).toBeInTheDocument();
    
    // Click the close button (assuming it has an accessible name or role)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(button => 
      button.getAttribute('aria-label') === 'Close' || 
      button.className.includes('close')
    );
    
    if (closeButton) {
      await act(async () => {
        userEvent.click(closeButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Info')).not.toBeInTheDocument();
      });
    }
  });

  test('clears all notifications when clear all is triggered', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Add multiple notifications
    await act(async () => {
      userEvent.click(screen.getByText('Show Success'));
      userEvent.click(screen.getByText('Show Error'));
    });

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Clear all notifications
    await act(async () => {
      userEvent.click(screen.getByText('Clear All'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
  });
}); 