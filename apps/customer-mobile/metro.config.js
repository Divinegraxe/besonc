// Metro config for the BESONC customer mobile app.
//
// This app lives inside an Nx monorepo at apps/customer-mobile/. The
// monorepo's root node_modules/ holds shared deps (and is where pnpm
// hoists things via .pnpm/), but the app's own node_modules/ is what
// Metro looks at by default. Without this config, Metro can't find
// any package hoisted to the workspace root (e.g. @babel/runtime),
// and bundling fails with:
//   "Unable to resolve module @babel/runtime/helpers/interopRequireDefault"
//
// Reference: https://docs.expo.dev/guides/monorepos/

const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// monorepo root is two levels up: apps/customer-mobile/ -> ../../  (the
// Nx workspace root where the root package.json, nx.json, etc. live)
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the monorepo root so changes to shared libs and root deps
//    trigger Metro re-bundles.
config.watchFolders = [monorepoRoot];

// 2. Tell the resolver to look in BOTH the project's node_modules
//    (where Expo, react-native, etc. live) AND the monorepo's
//    node_modules (where @babel/runtime and other shared deps live).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Don't let Metro silently walk up past these two paths looking
//    for more node_modules — otherwise it could pick up stale versions
//    of packages from some unrelated parent dir.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
