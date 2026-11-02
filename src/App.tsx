import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSettings } from './lib/settings';
import Home from './screens/Home';
import Library from './screens/Library';
import Onboarding from './screens/Onboarding';

const Reader = lazy(() => import('./screens/Reader'));
const Import = lazy(() => import('./screens/Import'));
const Quotes = lazy(() => import('./screens/Quotes'));
const Stats = lazy(() => import('./screens/Stats'));
const PaceTest = lazy(() => import('./screens/PaceTest'));
const Profile = lazy(() => import('./screens/Profile'));

function Gate({ children }: { children: React.ReactNode }) {
  const st = useSettings();
  const loc = useLocation();
  if (!st.onboarded && loc.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Suspense fallback={null}>
          <Gate>
            <Routes>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/" element={<Home />} />
              <Route path="/library" element={<Library />} />
              <Route path="/import" element={<Import />} />
              <Route path="/read/:id" element={<Reader />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/test" element={<PaceTest />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Gate>
        </Suspense>
      </div>
    </HashRouter>
  );
}
