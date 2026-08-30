import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* Puts the viewport back at the top whenever the route changes.
   React Router keeps the scroll position on navigation by default. */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
