import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressIndicator from '../ui/ProgressIndicator';

describe('ProgressIndicator', () => {
  test('renders with uploading status correctly', () => {
    render(
      <ProgressIndicator
        status="uploading"
        progress={65}
        fileName="document.pdf"
        fileSize="2.5 MB"
      />
    );
    
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    
    // Progress bar should be present with appropriate aria attributes
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '65');
  });

  test('renders error status with message', () => {
    render(
      <ProgressIndicator
        status="error"
        progress={0}
        fileName="invalid.pdf"
        fileSize="1.2 MB"
        errorMessage="File is corrupted or password protected"
      />
    );
    
    expect(screen.getByText('invalid.pdf')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('File is corrupted or password protected')).toBeInTheDocument();
    
    // Progress bar should not be present for error status
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('renders complete status correctly', () => {
    render(
      <ProgressIndicator
        status="complete"
        progress={100}
        fileName="completed.pdf"
        fileSize="3.7 MB"
      />
    );
    
    expect(screen.getByText('completed.pdf')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    
    // Progress bar should not be present for complete status
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('renders children content when provided', () => {
    render(
      <ProgressIndicator
        status="processing"
        progress={40}
        fileName="processing.pdf"
      >
        <button>Cancel</button>
      </ProgressIndicator>
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('renders estimated time remaining when provided', () => {
    render(
      <ProgressIndicator
        status="processing"
        progress={25}
        fileName="large.pdf"
        estimatedTimeRemaining="2 minutes"
      />
    );
    
    expect(screen.getByText('2 minutes remaining')).toBeInTheDocument();
  });
}); 