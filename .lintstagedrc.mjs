export default {
  // Check backend
  "backend/src/**/*.ts": (files) => {
    const relativeFiles = files.map((f) => f.replace(/^backend\//, ""));
    return [
      `npx prettier --write ${files.map((f) => `"${f}"`).join(" ")}`,
      `pnpm -C backend exec eslint --fix --quiet ${relativeFiles.map((f) => `"${f}"`).join(" ")}`,
    ];
  },
  // Check frontend
  "frontend/src/**/*.{ts,tsx}": (files) => {
    const relativeFiles = files.map((f) => f.replace(/^frontend\//, ""));
    return [
      `npx prettier --write ${files.map((f) => `"${f}"`).join(" ")}`,
      `pnpm -C frontend exec eslint --fix --quiet ${relativeFiles.map((f) => `"${f}"`).join(" ")}`,
    ];
  },
  // Root config files
  "*.{js,mjs,cjs,json}": (files) => {
    return [`npx prettier --write ${files.map((f) => `"${f}"`).join(" ")}`];
  },
};
