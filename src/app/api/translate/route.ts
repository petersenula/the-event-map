import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { q, targetLang } = await req.json();

    if (!q || !targetLang) {
      return new Response(JSON.stringify({ error: 'Missing data' }), { status: 400 });
    }

    console.log('typeof q:', typeof q);
    console.log('Array.isArray(q):', Array.isArray(q));
    console.log('targetLang:', targetLang);
    console.log('payload:', {
        q: Array.isArray(q) ? q.join(' ') : q,
      target: targetLang,
      format: 'text',
      source: 'auto'
    });

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: Array.isArray(q) ? q : [q],
          target: targetLang,
          format: 'text',
          source: 'auto'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Translation API response error:', {
        status: response.status,
        statusText: response.statusText,
        body: data
      });
      console.error('Raw error details:', JSON.stringify(data, null, 2));
      return new Response(JSON.stringify({ error: 'Translation failed', details: data }), {
        status: response.status
      });
    }

    const translatedText = data?.data?.translations?.[0]?.translatedText;

    if (translatedText) {
      return new Response(JSON.stringify({ translatedText }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: 'No translation returned', details: data }), {
        status: 500
      });
    }
  } catch (error) {
    console.error('Translation request failed:', error);
    return new Response(JSON.stringify({ error: 'Translation request failed', details: error }), {
      status: 500
    });
  }
}
