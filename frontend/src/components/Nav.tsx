import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/sessions", label: "Sessions" },
  { to: "/wallets", label: "Wallets" },
  { to: "/fingerprints", label: "Fingerprints" },
  { to: "/rl", label: "RL" },
];

/** Top nav with links to main sections. */
export function Nav() {
  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-4 flex gap-4 h-12 items-center">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm font-medium ${
                isActive ? "bg-slate-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
