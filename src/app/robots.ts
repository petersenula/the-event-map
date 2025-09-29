export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://ch.the-event-map.com/sitemap.xml',
  };
}
