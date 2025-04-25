import React from 'react';
import { render, screen } from '@testing-library/react';
import PDFThumbnailGrid from '../PDFThumbnailGrid';
import PDFThumbnailRenderer from '../PDFThumbnailRenderer';

// Mock the PDFThumbnailRenderer component
jest.mock('../PDFThumbnailRenderer', () => {
  return jest.fn(props => (
    <div data-testid={`thumbnail-${props.pageNumber}`}>
      Thumbnail {props.pageNumber}
      {props.selected && <span>Selected</span>}
    </div>
  ));
});

// Cast the mocked component to the correct Jest mock type
const MockedPDFThumbnailRenderer = PDFThumbnailRenderer as jest.MockedFunction<typeof PDFThumbnailRenderer>;

// Mock ResizeObserver
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

describe('PDFThumbnailGrid', () => {
  const mockPdfData = new ArrayBuffer(10);
  const mockOnPageSelect = jest.fn();
  const mockOnPagePreview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    MockedPDFThumbnailRenderer.mockClear();
  });

  it('renders the correct number of thumbnails', () => {
    render(
      <PDFThumbnailGrid
        pdfData={mockPdfData}
        pageCount={5}
        selectedPages={[]}
        onPageSelect={mockOnPageSelect}
        onPagePreview={mockOnPagePreview}
      />
    );

    // Check that we rendered the expected number of thumbnails
    // Initially, we should see at least the visible thumbnails (up to 20 by default)
    expect(MockedPDFThumbnailRenderer).toHaveBeenCalledTimes(5);
    
    // Check that we have 5 thumbnails visible
    const thumbnails = screen.getAllByTestId(/thumbnail-\d+/);
    expect(thumbnails).toHaveLength(5);
  });

  it('passes the correct props to PDFThumbnailRenderer', () => {
    const selectedPages = [2, 3];
    
    render(
      <PDFThumbnailGrid
        pdfData={mockPdfData}
        pageCount={5}
        thumbnailWidth={200}
        thumbnailHeight={280}
        selectedPages={selectedPages}
        onPageSelect={mockOnPageSelect}
        onPagePreview={mockOnPagePreview}
      />
    );

    // Check props for page 1 (not selected)
    const page1Call = MockedPDFThumbnailRenderer.mock.calls.find(
      call => call[0].pageNumber === 1
    );
    expect(page1Call).toBeDefined();
    expect(page1Call?.[0]).toMatchObject({
      pdfData: mockPdfData,
      width: 200,
      height: 280,
      selected: false
    });

    // Check props for page 2 (selected)
    const page2Call = MockedPDFThumbnailRenderer.mock.calls.find(
      call => call[0].pageNumber === 2
    );
    expect(page2Call).toBeDefined();
    expect(page2Call?.[0]).toMatchObject({
      pdfData: mockPdfData,
      width: 200,
      height: 280,
      selected: true
    });
  });

  it('shows selected thumbnails correctly', () => {
    render(
      <PDFThumbnailGrid
        pdfData={mockPdfData}
        pageCount={5}
        selectedPages={[2, 4]}
        onPageSelect={mockOnPageSelect}
        onPagePreview={mockOnPagePreview}
      />
    );

    // Pages 2 and 4 should be marked as selected
    expect(screen.getByTestId('thumbnail-2')).toHaveTextContent('Selected');
    expect(screen.getByTestId('thumbnail-4')).toHaveTextContent('Selected');
    
    // Pages 1, 3, and 5 should not be marked as selected
    expect(screen.getByTestId('thumbnail-1')).not.toHaveTextContent('Selected');
    expect(screen.getByTestId('thumbnail-3')).not.toHaveTextContent('Selected');
    expect(screen.getByTestId('thumbnail-5')).not.toHaveTextContent('Selected');
  });

  it('handles selection callback correctly', () => {
    render(
      <PDFThumbnailGrid
        pdfData={mockPdfData}
        pageCount={5}
        selectedPages={[]}
        onPageSelect={mockOnPageSelect}
        onPagePreview={mockOnPagePreview}
      />
    );

    // Find the first page thumbnail callback
    const firstThumbCall = MockedPDFThumbnailRenderer.mock.calls.find(
      call => call[0].pageNumber === 1
    );
    
    // Make sure we found the call
    expect(firstThumbCall).toBeDefined();
    
    // Get the onSelect handler
    const onSelectHandler = firstThumbCall?.[0].onSelect;
    
    // Make sure the handler exists
    expect(onSelectHandler).toBeDefined();
    
    // Call the handler with page 1
    onSelectHandler?.(1);
    
    // Verify our grid's onPageSelect callback was called
    expect(mockOnPageSelect).toHaveBeenCalledWith(1, false);
  });

  it('creates the correct grid layout', () => {
    render(
      <PDFThumbnailGrid
        pdfData={mockPdfData}
        pageCount={10}
        thumbnailWidth={100}
        gap={8}
        selectedPages={[]}
      />
    );

    // Check that we have a container div for the grid
    const gridContainer = document.querySelector('.pdf-thumbnail-grid-container');
    expect(gridContainer).toBeInTheDocument();
    
    // Check that we have absolutely positioned thumbnails
    const thumbnailContainers = document.querySelectorAll('.absolute');
    expect(thumbnailContainers.length).toBe(10);
  });
}); 