import { useMutation } from '@tanstack/react-query';
import { learningAdminApi } from '../api';

export function usePreviewYouTubeMutation() {
  return useMutation({
    mutationFn: (url: string) => learningAdminApi.previewYouTube(url),
  });
}

export function usePreviewYouTubePlaylistMutation() {
  return useMutation({
    mutationFn: (url: string) => learningAdminApi.previewYouTubePlaylist(url),
  });
}
