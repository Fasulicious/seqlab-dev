import { useEffect, useState } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
  RedirectToSignIn,
  SignIn,
  SignUp,
  useAuth,
} from '@clerk/clerk-react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminUpload from './AdminUpload';
import VideoList from './VideoList';

// This securely reads the environment variable you set in the `.dev.vars` file.
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .dev.vars file.');
}

// Component shown to logged-in users
function MainContent() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [ userRole, setUserRole ] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = await getToken();

        const response = await fetch('/api/user/role', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      }
    };

    fetchUserRole();
  }, [getToken]);

  return (
    <div className="p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
        Welcome, {user?.firstName || user?.primaryEmailAddress?.emailAddress}!
      </h1>
      <p className="mt-6 text-lg leading-8 text-gray-600">
        You are a <span className="font-semibold">{userRole || '...'}</span>.
      </p>
      {userRole === 'admin' && <AdminUpload />}

      <VideoList />
    </div>
  );
}

// Wrapper component to integrate Clerk with React Router
function ClerkProviderWithRoutes() {

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
    >
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">SeqLab</h1>
            <SignedIn>
              <UserButton afterSignOutUrl="/sign-in" />
            </SignedIn>
          </div>
        </header>
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <SignedIn>
                    <MainContent />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
            <Route
              path="/sign-in/*"
              element={<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />}
            />
            <Route
              path="/sign-up/*"
              element={<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />}
            />
          </Routes>
        </main>
      </div>
    </ClerkProvider>
  );
}

// Main App entry point
export default function App() {
  return (
    <BrowserRouter>
      <ClerkProviderWithRoutes />
    </BrowserRouter>
  );
}
