import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Home from "./routes/Home";
import Resultado from "./routes/Resultado";
import Admin from "./routes/Admin";
import { ConfigProvider } from "./state/ConfigContext";
import "./index.css";

// HashRouter: funciona em hospedagem estática sem configurar rewrites.
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "resultado", element: <Resultado /> },
      { path: "admin", element: <Admin /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>
);
