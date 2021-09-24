import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import Home from "./Home";
import Viewer from "./Viewer";


export default function App() {
    return (
        <Router>
            <Switch>
                <Route path="/viewer">
                    <Viewer />
                </Route>
                <Route path="/">
                    <Home />
                </Route>
            </Switch>
        </Router>
    );
    }