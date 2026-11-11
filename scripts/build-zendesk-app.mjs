import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "zendesk-app/manifest.json"), "utf8"));
const version = manifest.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`App version must look like 0.1.3, found ${version}`);
}
const scriptName = `sidebar-${version}.js`;
const styleName = `sidebar-${version}.css`;
const outfile = path.join(root, "zendesk-app/assets", scriptName);

await esbuild.build({
  entryPoints: [path.join(root, "zendesk-app/src/app.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  outfile,
  legalComments: "none",
  logLevel: "info",
});

fs.copyFileSync(
  path.join(root, "zendesk-app/assets/sidebar.css"),
  path.join(root, "zendesk-app/assets", styleName),
);

const sidebar = manifest?.location?.support?.ticket_sidebar;
if (sidebar?.url !== "assets/iframe.html" || manifest.frameworkVersion !== "2.0") {
  throw new Error("zendesk-app/manifest.json is not a Zendesk Apps Framework 2.0 ticket sidebar");
}

const html = fs.readFileSync(path.join(root, "zendesk-app/assets/iframe.html"), "utf8");
if (!html.includes(scriptName) || !html.includes(styleName)) {
  throw new Error("iframe.html does not reference the versioned sidebar assets");
}

const demoDir = path.join(root, "public/zendesk-app");
fs.mkdirSync(demoDir, { recursive: true });
for (const file of ["iframe.html", styleName, scriptName]) {
  fs.copyFileSync(path.join(root, "zendesk-app/assets", file), path.join(demoDir, file));
}

const bundled = fs.readFileSync(outfile, "utf8");
if (!bundled.includes("Live call audio is not connected")) {
  throw new Error("Built sidebar is missing the live-audio limitation");
}
if (bundled.includes("setTimeout(() => play")) {
  throw new Error("Built sidebar still autoplays the demo");
}
if (!bundled.includes(version)) {
  throw new Error("Built sidebar is missing the visible version");
}

console.log(`Built zendesk-app/assets/${scriptName} and public/zendesk-app`);
