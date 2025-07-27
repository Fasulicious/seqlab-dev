import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const CUSTOMER_CODE = import.meta.env.VITE_CLOUDFLARE_STREAM_CUSTOMER_CODE;

if (!CUSTOMER_CODE) {
  throw new Error('Missing VITE_CLOUDFLARE_STREAM_CUSTOMER_CODE. Please add it to your .dev.vars file.');
}

interface VideoPlayerProps {
  videoId: string;
}

export default function VideoPlayer({ videoId }: VideoPlayerProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchPlaybackToken = async () => {
      if (!videoId) return;
      try {
        const clerkToken = await getToken();
        const response = await fetch(`/api/videos/${videoId}/playback`, {
          headers: {
            Authorization: `Bearer ${clerkToken}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch playback token: ${response.statusText}`);
        }
        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error('Failed to fetch playback token:', error);
        setError('Failed to load video');
      }
    };

    fetchPlaybackToken();
  }, [videoId, getToken]);

  if (error) {
    return <div className="aspect-video bg-gray-200 rounded-md flex items-center justify-center text-red-500 font-semibold">{error}</div>;
  }

  if (!token) {
    return <div className="aspect-video bg-gray-200 rounded-md flex items-center justify-center text-gray-500">Loading Player...</div>;
  }

  return (
    <div style={{ position: 'relative', paddingTop: '56.25%' }}>
      <iframe
        src={`https://customer-262e87vaxtdhe2lh.cloudflarestream.com/${token}/iframe`}
        style={{
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen={true}
      ></iframe>
    </div>
  );
}
