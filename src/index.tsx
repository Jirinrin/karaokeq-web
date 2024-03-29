import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ApplicationContext from "./util/Context";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <BrowserRouter>
    <ApplicationContext>
      <App />
    </ApplicationContext>
  </BrowserRouter>
);
