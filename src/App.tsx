import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { GateSheet } from './pages/GateSheet';
import { LaunchesPage } from './pages/LaunchesPage';
import { LaunchOverviewPage } from './pages/LaunchOverviewPage';
import { AboutPage } from './pages/AboutPage';
import { NotBuilt } from './pages/NotBuilt';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/launches" replace />} />
          <Route path="launches" element={<LaunchesPage />} />
          {/* The gate sheet is nested so the overview stays mounted behind it (A4, section 19). */}
          <Route path="launches/:launchId" element={<LaunchOverviewPage />}>
            <Route path="gates/:gateId" element={<GateSheet />} />
          </Route>
          <Route path="launches/:launchId/risks" element={<NotBuilt title="Risk register" />} />
          <Route path="launches/:launchId/decisions" element={<NotBuilt title="Decision log" />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
