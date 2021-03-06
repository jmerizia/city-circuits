import React from "react";
import { Link } from "react-router-dom";


interface LayoutProps {
    children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
    return <>
        <div className='nav-bar'>
            <Link to={`${process.env.PUBLIC_URL}/`} className='nav-bar-link'>
                City Circuits
            </Link>
            {' - '}
            <Link to={`${process.env.PUBLIC_URL}/viewer`} className='nav-bar-link'>
                viewer
            </Link>
            {' - '}
            <Link to={`${process.env.PUBLIC_URL}/cluster`} className='nav-bar-link'>
                neuron cluster
            </Link>
            <a href='https://github.com/jmerizia/city-circuits' className='nav-bar-icon-right'>
                <img
                    src={`${process.env.PUBLIC_URL}/github-icon.svg`}
                />
            </a>
        </div>
        <div className='below-nav-bar'>
            {children}
        </div>
    </>;
}

export default Layout;