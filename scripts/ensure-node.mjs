const [major] = process.versions.node.split(".").map(Number);

if (major < 20) {
  console.error(
    `Node.js ${process.versions.node} is too old. Tracster requires Node.js 20 or newer.`,
  );
  console.error("");
  console.error("Options:");
  console.error("  - Install from https://nodejs.org/ (recommended: v22 LTS)");
  console.error('  - Or with nvm: nvm install 22 && nvm use');
  console.error('  - If Node 22 is already in ~/.local/node: export PATH="$HOME/.local/node/bin:$PATH"');
  process.exit(1);
}
