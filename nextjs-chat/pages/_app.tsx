// pages/_app.js

import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS
import '../styles/global.css'; // Import your global CSS
import { Fragment } from 'react';
import { MnemonicProvider } from '../contexts/MnemonicContext';


function MyApp({ Component, pageProps }) {
  return (
    <MnemonicProvider>
      <Component {...pageProps} />
    </MnemonicProvider>
  );
}

export default MyApp;

