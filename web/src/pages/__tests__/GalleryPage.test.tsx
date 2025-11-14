import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GalleryPage from '../GalleryPage';

// Mock the photo service
vi.mock('../../services/photoService', () => ({
  photoService: {
    getPhotos: vi.fn(),
    deletePhoto: vi.fn(),
    updatePhotoTags: vi.fn(),
  },
}));

// Mock useSearchParams
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => {
      const searchParams = new URLSearchParams(window.location.search);
      return [searchParams, mockSetSearchParams];
    },
  };
});

// Import mocked services after mocking
import { photoService } from '../../services/photoService';

const mockGetPhotos = vi.mocked(photoService.getPhotos);

describe('GalleryPage Pagination', () => {
  const mockPhotos = Array.from({ length: 45 }, (_, i) => ({
    id: `photo-${i}`,
    filename: `photo-${i}.jpg`,
    url: `https://example.com/photo-${i}.jpg`,
    uploadedAt: new Date().toISOString(),
    tags: [],
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetSearchParams.mockClear();
    mockGetPhotos.mockResolvedValue({
      photos: mockPhotos.slice(0, 15),
      totalCount: 45,
      page: 0,
      pageSize: 15,
      totalPages: 3,
    });
  });

  it('defaults to page 1 when no URL param is present', async () => {
    window.history.replaceState({}, '', '/gallery');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPhotos).toHaveBeenCalledWith(0, 15); // 0-indexed for API
    });
  });

  it('reads page number from URL query param (1-indexed)', async () => {
    window.history.replaceState({}, '', '/gallery?page=2');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPhotos).toHaveBeenCalledWith(1, 15); // page 2 in URL = index 1 for API
    });
  });

  it('displays correct page number (1-indexed) in UI', async () => {
    window.history.replaceState({}, '', '/gallery?page=2');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    // Wait for photos to load and pagination to render
    await waitFor(() => {
      expect(mockGetPhotos).toHaveBeenCalled();
      // Pagination only shows when totalPages > 1
      // Text is split: "Page " <span>2</span> " of " <span>3</span>
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Page 2 of 3 • 45 photos total';
      })).toBeInTheDocument();
    });
  });

  it('updates URL when clicking Next button', async () => {
    window.history.replaceState({}, '', '/gallery?page=1');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: '2' });
  });

  it('updates URL when clicking Previous button', async () => {
    window.history.replaceState({}, '', '/gallery?page=2');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: '1' });
  });

  it('validates and updates page from input field', async () => {
    window.history.replaceState({}, '', '/gallery?page=1');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Go to:/)).toBeInTheDocument();
    });

    const pageInput = screen.getByLabelText(/Go to:/) as HTMLInputElement;
    fireEvent.change(pageInput, { target: { value: '3' } });
    fireEvent.submit(pageInput.closest('form')!);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: '3' });
  });

  it('rejects invalid page input (too high)', async () => {
    window.history.replaceState({}, '', '/gallery?page=1');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Go to:/)).toBeInTheDocument();
    });

    const pageInput = screen.getByLabelText(/Go to:/) as HTMLInputElement;
    const initialValue = pageInput.value;
    fireEvent.change(pageInput, { target: { value: '999' } });
    fireEvent.submit(pageInput.closest('form')!);

    // Should reset to current page, not update URL
    expect(mockSetSearchParams).not.toHaveBeenCalled();
    expect(pageInput.value).toBe(initialValue);
  });

  it('rejects invalid page input (too low)', async () => {
    window.history.replaceState({}, '', '/gallery?page=2');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Go to:/)).toBeInTheDocument();
    });

    const pageInput = screen.getByLabelText(/Go to:/) as HTMLInputElement;
    const initialValue = pageInput.value;
    fireEvent.change(pageInput, { target: { value: '0' } });
    fireEvent.submit(pageInput.closest('form')!);

    expect(mockSetSearchParams).not.toHaveBeenCalled();
    expect(pageInput.value).toBe(initialValue);
  });

  it('disables Previous button on first page', async () => {
    window.history.replaceState({}, '', '/gallery?page=1');
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const prevButton = screen.getByText('Previous').closest('button');
      expect(prevButton).toBeDisabled();
    });
  });

  it('disables Next button on last page', async () => {
    window.history.replaceState({}, '', '/gallery?page=3');
    mockGetPhotos.mockResolvedValue({
      photos: mockPhotos.slice(30, 45),
      totalCount: 45,
      page: 2,
      pageSize: 15,
      totalPages: 3,
    });

    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).toBeDisabled();
    });
  });
});

