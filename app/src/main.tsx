import { render } from 'preact';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import './styles.css';
import { initTheme } from './state/theme';
import { App } from './App';
import { initSession } from './state/session';

Promise.all([initSession(), initTheme()]).finally(() => {
  render(<App />, document.getElementById('app')!);
});
