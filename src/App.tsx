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
                <Route path={`${process.env.PUBLIC_URL}/viewer`}>
                    <Viewer />
                </Route>
                <Route path={`${process.env.PUBLIC_URL}/`}>
                    <Home />
                </Route>
            </Switch>
        </Router>
    );
}
