import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CourseFormModal, parseYouTubeVideoId, isYouTubePlaylist } from '../components/CourseFormModal';
import { learningAdminApi } from '../api';

describe('YouTube URL Helpers', () => {
  it('identifies playlist links correctly', () => {
    expect(isYouTubePlaylist('https://www.youtube.com/playlist?list=PL1234567890')).toBe(true);
    expect(isYouTubePlaylist('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890')).toBe(true);
    expect(isYouTubePlaylist('PL1234567890')).toBe(true);
    expect(isYouTubePlaylist('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isYouTubePlaylist('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
  });

  it('parses YouTube video IDs from various single video link formats', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://example.com/not-youtube')).toBeNull();
  });
});

describe('CourseFormModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders updated header label and placeholder inside Basic Details tab', () => {
    render(
      <CourseFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Quick Start from YouTube Video or Playlist (Optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., https://youtube.com... or https://youtube.com...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auto-fill/i })).toBeInTheDocument();
  });

  it('shows validation error when entering non-YouTube or invalid URL', async () => {
    render(
      <CourseFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('e.g., https://youtube.com... or https://youtube.com...');
    const autoFillBtn = screen.getByRole('button', { name: /auto-fill/i });

    fireEvent.change(input, { target: { value: 'https://not-youtube.com/something' } });
    fireEvent.click(autoFillBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Invalid YouTube URL. Please enter a valid YouTube video (watch, youtu.be, embed) or playlist link.')
      ).toBeInTheDocument();
    });
  });

  it('handles Case A (Playlist Link): auto-fills details and batch-stages all child items', async () => {
    const playlistSpy = vi.spyOn(learningAdminApi, 'previewYouTubePlaylist').mockResolvedValue({
      playlistId: 'PL123',
      title: 'Mastering TypeScript & Clean Architecture',
      description: 'Comprehensive video series on scalable TypeScript application patterns.',
      thumbnailUrl: 'https://img.youtube.com/vi/vid1/hqdefault.jpg',
      videoCount: 2,
      videos: [
        { videoId: 'vid1', title: '01: Introduction', durationSec: 300, durationText: '5:00', thumbnailUrl: 'https://img.youtube.com/vi/vid1/hqdefault.jpg' },
        { videoId: 'vid2', title: '02: Domain Entities', durationSec: 600, durationText: '10:00', thumbnailUrl: 'https://img.youtube.com/vi/vid2/hqdefault.jpg' },
      ],
    });

    render(
      <CourseFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('e.g., https://youtube.com... or https://youtube.com...');
    const autoFillBtn = screen.getByRole('button', { name: /auto-fill/i });

    fireEvent.change(input, { target: { value: 'https://www.youtube.com/playlist?list=PL123' } });
    fireEvent.click(autoFillBtn);

    await waitFor(() => {
      expect(playlistSpy).toHaveBeenCalledWith('https://www.youtube.com/playlist?list=PL123');
      expect(screen.getByText(/Successfully loaded 2 videos from "Mastering TypeScript & Clean Architecture"!/)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/course title/i)).toHaveValue('Mastering TypeScript & Clean Architecture');
    expect(screen.getByLabelText(/url slug/i)).toHaveValue('mastering-typescript-clean-architecture');
    expect(screen.getByLabelText(/course description/i)).toHaveValue('Comprehensive video series on scalable TypeScript application patterns.');

    // Switch to Instructor & Curriculum tab
    const curriculumTabBtn = screen.getByRole('button', { name: /instructor & curriculum/i });
    fireEvent.click(curriculumTabBtn);

    expect(screen.getByText('Staged Curriculum Lessons (2)')).toBeInTheDocument();
    expect(screen.getByText('01: Introduction')).toBeInTheDocument();
    expect(screen.getByText('02: Domain Entities')).toBeInTheDocument();
  });

  it('handles Case B (Single Video Link): parses Video ID, auto-fills Title/Description, and stages single video as Lesson 1', async () => {
    const videoSpy = vi.spyOn(learningAdminApi, 'previewYouTube').mockResolvedValue({
      videoId: 'dQw4w9WgXcQ',
      title: 'Clean Architecture in TypeScript Full Course',
      description: 'Hands-on guide to building modular services and clean boundaries.',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      embeddable: true,
      authorName: 'Prof. Alex Mercer',
      durationSec: 1800,
    });

    const onSubmit = vi.fn();

    render(
      <CourseFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText('e.g., https://youtube.com... or https://youtube.com...');
    const autoFillBtn = screen.getByRole('button', { name: /auto-fill/i });

    // Test shortened share link youtu.be/
    fireEvent.change(input, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.click(autoFillBtn);

    await waitFor(() => {
      expect(videoSpy).toHaveBeenCalledWith('https://youtu.be/dQw4w9WgXcQ');
      expect(screen.getByText(/Successfully loaded "Clean Architecture in TypeScript Full Course" and staged as Lesson 1!/)).toBeInTheDocument();
    });

    // Check Auto-filled fields in Basic Details
    expect(screen.getByLabelText(/course title/i)).toHaveValue('Clean Architecture in TypeScript Full Course');
    expect(screen.getByLabelText(/url slug/i)).toHaveValue('clean-architecture-in-typescript-full-course');
    expect(screen.getByLabelText(/course description/i)).toHaveValue('Hands-on guide to building modular services and clean boundaries.');

    // Switch to Instructor & Curriculum tab
    const curriculumTabBtn = screen.getByRole('button', { name: /instructor & curriculum/i });
    fireEvent.click(curriculumTabBtn);

    // Verify Lesson 1 is present in the curriculum state
    expect(screen.getByText('Staged Curriculum Lessons (1)')).toBeInTheDocument();
    expect(screen.getByText('Clean Architecture in TypeScript Full Course')).toBeInTheDocument();
    expect(screen.getByText(/YouTube: dQw4w9WgXcQ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/instructor \/ faculty \/ mentor name/i)).toHaveValue('Prof. Alex Mercer');

    // Submit form and verify payload contains single video as Lesson 1
    const submitBtn = screen.getByRole('button', { name: 'Create Course' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Clean Architecture in TypeScript Full Course',
          slug: 'clean-architecture-in-typescript-full-course',
          description: 'Hands-on guide to building modular services and clean boundaries.',
          lessons: [
            {
              title: 'Clean Architecture in TypeScript Full Course',
              type: 'YOUTUBE',
              youtubeVideoId: 'dQw4w9WgXcQ',
              durationSec: 1800,
              order: 1,
            },
          ],
        })
      );
    });
  });
});
