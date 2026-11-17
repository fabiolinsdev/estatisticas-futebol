import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../src/routes.tsx";

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  render(<RouterProvider router={router} />);
  const location = () => router.state.location.pathname + router.state.location.search;
  return { user, location };
}
