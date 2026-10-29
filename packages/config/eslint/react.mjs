import reactHooks from "eslint-plugin-react-hooks";
import base from "./base.mjs";

const hooks = reactHooks.configs.flat["recommended-latest"] ?? reactHooks.configs.flat.recommended;

export default [...base, ...(Array.isArray(hooks) ? hooks : [hooks])];
