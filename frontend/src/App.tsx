import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { SessionsPage } from "./pages/SessionsPage";
import { WalletsPage } from "./pages/WalletsPage";
import { FingerprintsPage } from "./pages/FingerprintsPage";

/** Root app with routes. */
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/wallets" element={<WalletsPage />} />
        <Route path="/fingerprints" element={<FingerprintsPage />} />
      </Routes>
    </Layout>
  );
}
