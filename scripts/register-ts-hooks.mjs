import { register } from "node:module";

register(new URL("./ts-extension-hook.mjs", import.meta.url).href, import.meta.url);
