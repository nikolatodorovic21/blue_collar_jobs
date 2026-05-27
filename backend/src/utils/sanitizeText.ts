import sanitizeHtml from 'sanitize-html';

export const stripHtml = (input: string): string =>
  sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
