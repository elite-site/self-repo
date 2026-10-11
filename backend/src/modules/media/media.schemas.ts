import { MediaType } from './media.types';

const ALLOWED_MEDIA_TYPES: readonly MediaType[] = [
  'video',
  'photo',
  'resume',
  'certificate',
  'achievement',
];

export function isValidMediaType(type: string): type is MediaType {
  return ALLOWED_MEDIA_TYPES.includes(type as MediaType);
}
