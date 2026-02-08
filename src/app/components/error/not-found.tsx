import { Link, useLocation } from "react-router-dom";
import { Skeleton } from "../ui/skeleton";

export function NotFound() {
  const location = useLocation();

  return (
    <div className="container-fluid">
      <Skeleton className="rounded-lg grow h-screen justify-center flex">
        <div className="flex-1 items-center justify-center flex-col gap-2 hidden lg:flex">
          <h1>404</h1>

          <p>
            No route matches <code>{location.pathname}</code>
          </p>

          <Link to="/app">Go back home</Link>
        </div>
      </Skeleton>
    </div>
  );
}
