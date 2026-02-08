import React, { useState } from "react";
import "./App.css";
import "@vibe/core/tokens";
import { Heading, Button } from "@vibe/core";
import { useMondayContext } from "./hooks/useMondayContext";
import { CreateOrderView } from "./components/CreateOrderView";
import { OrdersListView } from "./components/OrdersListView";

const VIEW_CREATE = "create";
const VIEW_LIST = "list";

const App = () => {
  const { monday, boardId } = useMondayContext();
  const [view, setView] = useState(VIEW_CREATE);

  return (
    <div className="App">
      <header className="app-nav">
        <Heading>Create Candle Order</Heading>
        <nav className="app-nav-tabs">
          <Button
            kind={view === VIEW_CREATE ? "primary" : "tertiary"}
            size="small"
            onClick={() => setView(VIEW_CREATE)}
          >
            Create order
          </Button>
          <Button
            kind={view === VIEW_LIST ? "primary" : "tertiary"}
            size="small"
            onClick={() => setView(VIEW_LIST)}
          >
            View orderssss
          </Button>
        </nav>
      </header>
      <main className="app-main">
        {view === VIEW_CREATE && <CreateOrderView monday={monday} boardId={boardId} />}
        {view === VIEW_LIST && <OrdersListView monday={monday} boardId={boardId} />}
      </main>
    </div>
  );
};

export default App;
