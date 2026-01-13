// Cloudflare Worker for secure Cloudinary upload signing

interface Env {
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
}

// Generate SHA-1 signature for Cloudinary
async function generateSignature(params: Record<string, string>, apiSecret: string): Promise<string> {
  // Sort parameters alphabetically and create string to sign
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const stringToSign = sortedParams + apiSecret;

  // Generate SHA-1 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Optional: Verify Firebase ID token for authentication
      // For now, we'll add a simple origin check
      const origin = request.headers.get('Origin') || '';

      // You can restrict to your domain after deployment:
      // if (!origin.includes('your-domain.com') && !origin.includes('localhost')) {
      //   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      //     status: 403,
      //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      //   });
      // }

      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'chat_images';

      // Parameters to sign
      const params: Record<string, string> = {
        timestamp: timestamp.toString(),
        folder: folder,
      };

      // Generate signature
      const signature = await generateSignature(params, env.CLOUDINARY_API_SECRET);

      return new Response(
        JSON.stringify({
          signature,
          timestamp,
          folder,
          cloudName: env.CLOUDINARY_CLOUD_NAME,
          apiKey: env.CLOUDINARY_API_KEY,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error generating signature:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate signature' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
