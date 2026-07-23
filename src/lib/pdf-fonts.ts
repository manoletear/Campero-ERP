// Fonts and logo as base64 data URIs — no network fetch required.
// react-pdf v4 detects data URIs and decodes via atob() without any HTTP request,
// which is required in CF Workers where subrequests to self return 404 for static assets.
export { FONT_REGULAR, FONT_MEDIUM, FONT_BOLD, LOGO_URL } from '@/lib/pdf-font-data';
