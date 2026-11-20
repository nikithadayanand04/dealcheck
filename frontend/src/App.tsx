import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import { Container, Skeleton } from "./components/ui";

// Heavier pages (charts) load on demand so the home page opens fast.
const Check = lazy(() => import("./pages/Check"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Learn = lazy(() => import("./pages/Learn"));
const About = lazy(() => import("./pages/About"));
const Admin = lazy(() => import("./pages/Admin"));

const Loading = () => (
  <Container className="py-20" >
    <Skeleton className="h-10 w-1/2" />
    <Skeleton className="mt-6 h-64 w-full" />
  </Container>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="check" element={<Suspense fallback={<Loading />}><Check /></Suspense>} />
          <Route path="quiz" element={<Suspense fallback={<Loading />}><Quiz /></Suspense>} />
          <Route path="learn" element={<Suspense fallback={<Loading />}><Learn /></Suspense>} />
          <Route path="about" element={<Suspense fallback={<Loading />}><About /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<Loading />}><Admin /></Suspense>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#12264A", border: "1px solid #24406E", borderRadius: 10, fontFamily: "Inter, sans-serif", color: "#E6F4FA" } }} />
    </BrowserRouter>
  );
}
