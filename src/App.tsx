import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { LaunchesPage } from './pages/LaunchesPage';
import { LaunchOverviewPage } from './pages/LaunchOverviewPage';
import { NotBuilt } from './pages/NotBuilt';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/launches" replace />} />
          <Route path="launches" element={<LaunchesPage />} />
          <Route path="launches/:launchId" element={<LaunchOverviewPage />} />
          <Route path="launches/:launchId/gates/:gateId" element={<NotBuilt title="Gate detail" />} />
          <Route path="launches/:launchId/risks" element={<NotBuilt title="Risk register" />} />
          <Route path="launches/:launchId/decisions" element={<NotBuilt title="Decision log" />} />
          <Route path="about" element={<NotBuilt title="About" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
