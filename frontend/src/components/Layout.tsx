import { Outlet } from "react-router-dom";
import { Nav } from "./Nav";

/** Layout with nav and outlet for child routes. */
export function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 p-6">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
