import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Tutor from "./pages/Tutor";
import LearningPath from "./pages/LearningPath";
import Subjects from "./pages/Subjects";
import Practice from "./pages/Practice";
import Progress from "./pages/Progress";
import Library from "./pages/Library";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import LessonPlayer from "./pages/LessonPlayer";
import Games from "./pages/Games";
import Videos from "./pages/Videos";
import StoryPlayer from "./pages/StoryPlayer";
import GrownUps from "./pages/GrownUps";
import WorkbookHome from "./pages/WorkbookHome";
import WorkbookUnit from "./pages/WorkbookUnit";
import WordBank from "./pages/WordBank";
import CertificateView from "./pages/CertificateView";
import FinalProjectView from "./pages/FinalProjectView";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Child Learning Portal Routes */}
        <Route index element={<Dashboard />} />
        
        {/* Official Parivestra AI Workbooks */}
        <Route path="workbook" element={<WorkbookHome />} />
        <Route path="workbook/:grade/unit/:unitNumber" element={<WorkbookUnit />} />
        <Route path="workbook/word-bank" element={<WordBank />} />
        <Route path="workbook/certificate" element={<CertificateView />} />
        <Route path="workbook/:grade/project" element={<FinalProjectView />} />

        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="courses/:id/lessons/:lessonId" element={<LessonPlayer />} />
        <Route path="tutor" element={<Tutor />} />
        <Route path="practice" element={<Practice />} />
        <Route path="games" element={<Games />} />
        <Route path="videos" element={<Videos />} />
        <Route path="videos/story/:storyId" element={<StoryPlayer />} />
        <Route path="learning-path" element={<LearningPath />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="library" element={<Library />} />
        <Route path="progress" element={<Progress />} />

        {/* Grown-ups & Teacher Area */}
        <Route path="grown-ups" element={<GrownUps />} />

        {/* Legacy Redirects */}
        <Route path="resources" element={<Navigate to="/library" replace />} />
        <Route path="settings" element={<Navigate to="/grown-ups" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
