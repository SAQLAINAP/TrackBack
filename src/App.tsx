import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { SectionPage } from "./pages/SectionPage";
import { CoursePage } from "./pages/CoursePage";
import { LessonPage } from "./pages/LessonPage";
import { RevisionPage } from "./pages/RevisionPage";
import { SearchPage } from "./pages/SearchPage";
import { LeetCodePage } from "./pages/LeetCodePage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/section/:sectionId" element={<SectionPage />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/revision" element={<RevisionPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/leetcode" element={<LeetCodePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}
