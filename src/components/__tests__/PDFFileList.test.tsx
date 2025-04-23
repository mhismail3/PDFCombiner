import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PDFFileList from '../PDFFileList';
import { PDFFile } from '../../store/slices/pdfSlice';
import FileItem from '../FileItem';

// Mock components
jest.mock('../FileItem', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(({ file, onRemove, onRetry }) => (
      <div data-testid={`file-item-${file.id}`}>
        <span>{file.name}</span>
        <button onClick={() => onRemove(file.id)}>Remove</button>
        {file.status === 'error' && onRetry && (
          <button onClick={() => onRetry(file.id)}>Retry</button>
        )}
      </div>
    ))
  };
});

// Mock the Button component to avoid UI library dependencies
jest.mock('../ui', () => ({
  Button: ({ 
    children, 
    onClick, 
    disabled 
  }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean 
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

// Mock the formatFileSize utility function
jest.mock('../../utils/pdfUtils', () => ({
  formatFileSize: jest.fn().mockReturnValue('1 KB'),
}));

describe('PDFFileList', () => {
  const mockOnRemove = jest.fn();
  const mockOnRetry = jest.fn();
  const mockOnClearAll = jest.fn();
  const mockOnCombine = jest.fn();
  const mockOnClearErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation for each test
    (FileItem as jest.Mock).mockImplementation(({ file, onRemove, onRetry }) => (
      <div data-testid={`file-item-${file.id}`}>
        <span>{file.name}</span>
        <button onClick={() => onRemove(file.id)}>Remove</button>
        {file.status === 'error' && onRetry && (
          <button onClick={() => onRetry(file.id)}>Retry</button>
        )}
      </div>
    ));
  });

  const createMockFile = (id: string, status: 'ready' | 'error' | 'loading' = 'ready', error = ''): PDFFile => ({
    id,
    name: `file-${id}.pdf`,
    size: 1024,
    lastModified: Date.now(),
    type: 'application/pdf',
    status,
    pageCount: 5,
    error,
    data: null,
    preview: null,
    selected: false,
  });

  test('renders nothing when no files are provided', () => {
    const { container } = render(
      <PDFFileList
        files={[]}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('renders valid files correctly', () => {
    const validFiles = [
      createMockFile('1'),
      createMockFile('2'),
    ];
    
    render(
      <PDFFileList
        files={validFiles}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    expect(screen.getByText('2 valid files')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-2')).toBeInTheDocument();
    expect(screen.getByText('Combine 2 Files')).toBeInTheDocument();
  });

  test('renders error files correctly', () => {
    const files = [
      createMockFile('1'),
      createMockFile('2', 'error', 'Invalid PDF'),
    ];
    
    render(
      <PDFFileList
        files={files}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    expect(screen.getByText('1 valid file')).toBeInTheDocument();
    expect(screen.getByText('1 error')).toBeInTheDocument();
    expect(screen.getByText('Files with Errors')).toBeInTheDocument();
    expect(screen.getByText('Valid Files')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-2')).toBeInTheDocument();
    expect(screen.getByText('Clear Errors')).toBeInTheDocument();
  });

  test('renders loading files correctly', () => {
    const files = [
      createMockFile('1'),
      createMockFile('2', 'loading'),
    ];
    
    render(
      <PDFFileList
        files={files}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    expect(screen.getByText('1 valid file')).toBeInTheDocument();
    expect(screen.getByText('1 processing')).toBeInTheDocument();
    expect(screen.getByText('Processing Files')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-2')).toBeInTheDocument();
  });

  test('calls onClearAll when clear all button is clicked', () => {
    const files = [createMockFile('1'), createMockFile('2')];
    
    render(
      <PDFFileList
        files={files}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    fireEvent.click(screen.getByText('Clear All'));
    
    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
  });

  test('calls onCombine when combine button is clicked', () => {
    const files = [createMockFile('1'), createMockFile('2')];
    
    render(
      <PDFFileList
        files={files}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    fireEvent.click(screen.getByText('Combine 2 Files'));
    
    expect(mockOnCombine).toHaveBeenCalledTimes(1);
  });

  test('calls onClearErrors when clear errors button is clicked', () => {
    const files = [
      createMockFile('1'),
      createMockFile('2', 'error', 'Invalid PDF'),
    ];
    
    render(
      <PDFFileList
        files={files}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    // Get all elements with text "Clear Errors" (there could be multiple)
    const clearErrorsButtons = screen.getAllByText('Clear Errors');
    
    // Click the first one
    fireEvent.click(clearErrorsButtons[0]);
    
    expect(mockOnClearErrors).toHaveBeenCalledTimes(1);
  });

  test('combine button is disabled when there are less than 2 valid files', () => {
    const files = [createMockFile('1')];
    
    render(
      <PDFFileList
        files={files}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    const combineButton = screen.getByText('Combine 1 File');
    expect(combineButton).toBeDisabled();
  });

  test('combine button is disabled when there are loading files', () => {
    const files = [
      createMockFile('1'),
      createMockFile('2'),
      createMockFile('3', 'loading'),
    ];
    
    render(
      <PDFFileList
        files={files}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
        onClearAll={mockOnClearAll}
        onCombine={mockOnCombine}
        onClearErrors={mockOnClearErrors}
      />
    );
    
    const combineButton = screen.getByText('Combine 2 Files');
    expect(combineButton).toBeDisabled();
  });
}); 