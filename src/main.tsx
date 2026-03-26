import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";

// Apply saved theme safely to prevent startup crashes on restricted browsers
let savedTheme = "dark";
try {
  savedTheme = localStorage.getItem("qb-theme") || "dark";
} catch {
  savedTheme = "dark";
}
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
