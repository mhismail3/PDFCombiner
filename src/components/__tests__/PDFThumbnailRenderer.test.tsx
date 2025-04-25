import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PDFThumbnailRenderer from '../PDFThumbnailRenderer';
import { pdfThumbnailService } from '../../services/PDFThumbnailService';

// Mock the PDFThumbnailService
jest.mock('../../services/PDFThumbnailService', () => ({
  pdfThumbnailService: {
    getPageCount: jest.fn().mockResolvedValue(10),
    getThumbnail: jest.fn().mockResolvedValue('data:image/jpeg;base64,mockThumbnailData')
  }
}));

describe('PDFThumbnailRenderer', () => {
  const mockPdfData = new ArrayBuffer(10);
  const mockOnSelect = jest.fn();
  const mockOnPreview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={1}
      />
    );

    // Should display loading indicator
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('renders thumbnail once loaded', async () => {
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={1}
      />
    );

    // Wait for the thumbnail to load
    const thumbnail = await waitFor(() => screen.getByAltText('Page 1'));
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', 'data:image/jpeg;base64,mockThumbnailData');
  });

  it('calls onSelect when thumbnail is clicked', async () => {
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={2}
        onSelect={mockOnSelect}
      />
    );

    // Wait for the thumbnail to load
    const thumbnail = await waitFor(() => screen.getByAltText('Page 2'));
    
    // Click the thumbnail
    userEvent.click(thumbnail);
    
    // Verify onSelect was called with the correct page number
    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });

  it('calls onPreview when preview button is clicked', async () => {
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={3}
        onPreview={mockOnPreview}
      />
    );

    // Wait for the thumbnail to load
    await waitFor(() => screen.getByAltText('Page 3'));
    
    // Preview button is hidden until hovered, so find it by its accessible name
    const previewButton = screen.getByRole('button', { name: /preview page/i });
    
    // Click the preview button
    userEvent.click(previewButton);
    
    // Verify onPreview was called with the correct page number
    expect(mockOnPreview).toHaveBeenCalledWith(3);
  });

  it('shows selected state when selected prop is true', async () => {
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={4}
        selected={true}
      />
    );

    // Wait for the thumbnail to load
    await waitFor(() => screen.getByAltText('Page 4'));
    
    // Selection indicator is present when selected
    const selectedIndicator = document.querySelector('.bg-blue-500.top-1.left-1');
    expect(selectedIndicator).toBeInTheDocument();
  });

  it('handles errors when thumbnail generation fails', async () => {
    // Mock error in thumbnail generation
    (pdfThumbnailService.getThumbnail as jest.Mock).mockRejectedValueOnce(new Error('Failed to generate thumbnail'));
    
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={5}
      />
    );

    // Wait for error message to appear
    const errorMessage = await waitFor(() => screen.getByText(/Failed to generate thumbnail/i));
    expect(errorMessage).toBeInTheDocument();
  });

  it('displays page number badge with total count', async () => {
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={6}
        showPageNumber={true}
      />
    );

    // Wait for the page badge to appear with correct count
    const pageBadge = await waitFor(() => screen.getByText('6 / 10'));
    expect(pageBadge).toBeInTheDocument();
  });

  it('does not display page number badge when showPageNumber is false', async () => {
    render(
      <PDFThumbnailRenderer
        pdfData={mockPdfData}
        pageNumber={7}
        showPageNumber={false}
      />
    );

    // Wait for thumbnail to load
    await waitFor(() => screen.getByAltText('Page 7'));
    
    // Page badge should not be present
    const pageBadge = screen.queryByText('7 / 10');
    expect(pageBadge).not.toBeInTheDocument();
  });
}); 