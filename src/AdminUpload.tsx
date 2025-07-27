import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import * as tus from 'tus-js-client';

export default function AdminUpload() {
  const [ title, setTitle ] = useState('');
  const [ description, setDescription ] = useState('');
  const [ videoFile, setVideoFile ] = useState<File | null>(null);
  const [ uploadProgress, setUploadProgress ] = useState<number | null>(null);
  const [ statusMessage, setStatusMessage ] = useState('');
  const { getToken } = useAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!videoFile || !title) {
      setStatusMessage('Please provide a title and select a video file.');
      return;
    }

    setStatusMessage('Preparing upload...');
    setUploadProgress(0);

    try {
      const backendResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          name: videoFile.name,
          title: title,
          description: description,
          size: videoFile.size,
        })
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.text();
        throw new Error(`Failed to get upload URL from backend: ${errorData}`);
      }

      const { uploadURL } = await backendResponse.json();
      setStatusMessage('Uploading...');

      const upload = new tus.Upload(videoFile, {
        endpoint: uploadURL,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {
          filename: videoFile.name,
          filetype: videoFile.type,
        },
        onError: (error) => {
          console.error('Failed because: ', error);
          setStatusMessage(`Upload failed: ${error.message}`);
          setUploadProgress(null);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          setUploadProgress(Number(percentage));
        },
        onSuccess: () => {
          setStatusMessage('Upload successful! Video is now processing.');
          setUploadProgress(100);
          setTitle('');
          setDescription('');
          setVideoFile(null);
        },
      });

      upload.start();

    } catch (error) {
      console.error(error);
      setStatusMessage(`An error ocurred during the upload process`);
      setUploadProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h2 className="text-2xl font-bold mb-6">Upload New Video</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="video" className="block text-sm font-medium text-gray-700">Video File</label>
          <input
            type="file"
            id="video"
            accept="video/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Upload
        </button>
      </form>
      {uploadProgress !== null && (
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">{statusMessage}</p>
        </div>
      )}
    </div>
  )
}
