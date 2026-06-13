import { Link, NavLink, Outlet } from "react-router-dom";
import { useConfig } from "./state/ConfigContext";

export default function App() {
  const { config } = useConfig();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg text-marca">
            {config.marca.nome || "Calculadora de Obras"}
          </Link>
          <nav className="flex gap-4 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? "text-marca-accent font-medium" : "text-stone-500"
              }
            >
              Calculadora
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? "text-marca-accent font-medium" : "text-stone-500"
              }
            >
              Admin
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-stone-400">
          Estimativa orientativa — não substitui orçamento executivo. Tabela{" "}
          {config.meta.versaoTabela}.
        </div>
      </footer>
    </div>
  );
}
