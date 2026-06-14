// RouteErrorBoundary.tsx

import { useRouteError } from "react-router-dom";
import SomethingWentWrong from "./Pages/ErrorHandling/SomethingWentWrong";

export default function RouteErrorBoundary() {
  const error = useRouteError();

  console.error(error);

  return (
    <SomethingWentWrong
      onRetry={() => window.location.reload()}
    />
  );
}