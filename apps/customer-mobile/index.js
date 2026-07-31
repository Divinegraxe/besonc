// Local Expo entry. The default entry at
// `node_modules/expo/AppEntry.js` does `import App from '../../App'`,
// which would look for `App.tsx` at the parent of `apps/customer-mobile`
// (i.e. the monorepo root). That file doesn't exist there, so we use
// this local entry instead which imports from `./App` in this directory.
import registerRootComponent from 'expo/build/launch/registerRootComponent';
import App from './App';

registerRootComponent(App);
