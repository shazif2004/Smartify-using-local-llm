import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import QuizPage from "./pages/QuizPage";
import StudyPage from "./pages/StudyPage";
import UploadPage from "./pages/UploadPage";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/upload"
          element={<UploadPage />}
        />

        <Route
          path="/study/:documentId"
          element={<StudyPage />}
        />

        <Route
          path="/quiz"
          element={<QuizPage />}
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
