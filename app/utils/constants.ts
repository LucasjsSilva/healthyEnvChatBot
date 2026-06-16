export default class Constants {
  // Empty string = calls go through the Next.js proxy (next.config.js rewrites)
  // pointing to NEXT_PUBLIC_API_URL (default: http://localhost:5000)
  static baseUrl = '';

  static ghCliendId = process.env.NEXT_PUBLIC_GH_CLIENT_ID || '';
}