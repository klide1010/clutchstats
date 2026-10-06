import { render } from 'preact';
import './styles.css';
import { App } from './App';
import { initSession } from './state/session';

initSession().finally(() => {
  render(<App />, document.getElementById('app')!);
});
