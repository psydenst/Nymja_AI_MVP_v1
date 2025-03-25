// pages/_app.js

import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS
import '../styles/global.css'; // Import your global CSS
import { Fragment } from 'react';

function MyApp({ Component, pageProps }) {
  return (
    <Fragment>
      <Component {...pageProps} />
    </Fragment>
  );
}

export default MyApp;

