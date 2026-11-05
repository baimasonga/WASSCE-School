import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, useLocation } from "react-router";
import { Layout } from "./components/Layout";
import "./index.css";
import { AppProvider } from "./lib/store";
import { Admin } from "./pages/Admin";
import { Account, ForgotPassword, ResetPassword, SignIn, SignUp } from "./pages/Auth";
import { Home } from "./pages/Home";
import { About, DownloadPage, Lab, NotFound, Subjects } from "./pages/Info";
import { SessionPage } from "./pages/SessionPage";
import { Learn, Practice, ProgressPage } from "./pages/Study";

const TITLES: Record<string, string> = {
  "/": "WASSCE School · Practice, mock exams and worked solutions", "/learn": "Learn", "/practice": "Practice", "/progress": "Progress",
  "/session": "Practice session", "/subjects": "Subjects", "/lab": "Chemistry lab", "/download": "Android app", "/about": "About & privacy",
  "/signin": "Sign in", "/signup": "Create account", "/forgot-password": "Reset password", "/reset-password": "New password", "/account": "Account", "/admin": "Publishing",
};
function Titled({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => { const t = TITLES[pathname]; document.title = pathname === "/" ? t : `${t ?? "Not found"} · WASSCE School`; }, [pathname]);
  return children;
}

const router = createBrowserRouter([{
  element: <Titled><Layout /></Titled>,
  children: [
    { path: "/", element: <Home /> },
    { path: "/learn", element: <Learn /> },
    { path: "/practice", element: <Practice /> },
    { path: "/progress", element: <ProgressPage /> },
    { path: "/session", element: <SessionPage /> },
    { path: "/subjects", element: <Subjects /> },
    { path: "/lab", element: <Lab /> },
    { path: "/download", element: <DownloadPage /> },
    { path: "/about", element: <About /> },
    { path: "/signin", element: <SignIn /> },
    { path: "/signup", element: <SignUp /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/reset-password", element: <ResetPassword /> },
    { path: "/account", element: <Account /> },
    { path: "/admin", element: <Admin /> },
    { path: "*", element: <NotFound /> },
  ],
}]);

createRoot(document.getElementById("root")!).render(
  <StrictMode><AppProvider><RouterProvider router={router} /></AppProvider></StrictMode>,
);
