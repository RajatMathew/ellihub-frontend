import { Route, Routes } from "react-router";

export function HeaderRoutingSetup() {
  return (
    <Routes>
      <Route path="*">
        <Route path="*" element={<></>} />
      </Route>
    </Routes>
  );
}
