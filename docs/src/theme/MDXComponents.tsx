// Docusaurus's MDX components, plus the site's own, usable in any page without an import.
import MDXComponents from "@theme-original/MDXComponents";
import Prompt from "@site/src/components/Prompt";
import Screenshot from "@site/src/components/Screenshot";
import Terminal from "@site/src/components/Terminal";

export default { ...MDXComponents, Prompt, Screenshot, Terminal };
