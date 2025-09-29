export default async function sitemap() {
  const base = 'https://the-event-map.com';
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/events`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/events/today`, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${base}/events/weekend`, changeFrequency: 'daily', priority: 0.7 },
  ];
}
