import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import Cluster from "./Cluster";
import Home from "./Home";
import Layout from "./Layout";
import Viewer from "./Viewer";


export default function App() {
    return (
        <Router>
            <Switch>
                <Route path={`${process.env.PUBLIC_URL}/viewer`}>
                    <Layout>
                        <Viewer />
                    </Layout>
                </Route>
                <Route path={`${process.env.PUBLIC_URL}/cluster`}>
                    <Layout>
                        <Cluster />
                    </Layout>
                </Route>
                <Route path={`${process.env.PUBLIC_URL}/`}>
                    <Home />
                </Route>
            </Switch>
        </Router>
    );
}
