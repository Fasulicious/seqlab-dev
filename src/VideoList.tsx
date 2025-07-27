import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import VideoPlayer from './VideoPlayer';

interface Video {
  id: string;
  title: string;
  description: string;
  stream_uid: string;
}

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const token = await getToken();
        const response = await fetch('/api/videos', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        }
      } catch (error) {
        console.error('Failed to fetch videos', error);
      }
    };
    fetchVideos();
  }, [getToken]);

  if (selectedVideo) {
    return (
      <div>
        <button
          onClick={() => setSelectedVideo(null)}
          className="mb-4 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          &larr; Back to List
        </button>
        <h2 className="text-3xl font-bold mb-2">{selectedVideo.title}</h2>
        <p className="text-gray-600 mb-4">{selectedVideo.description}</p>
        <VideoPlayer videoId={selectedVideo.id} />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-3xl font-bold mb-6 text-center">Available Videos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div key={video.id} className="border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedVideo(video)}>
            <div className="aspect-video bg-gray-200 rounded-md mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">{video.title}</h3>
            <p className="text-sm text-gray-500 truncate">{video.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
