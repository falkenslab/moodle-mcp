import { existsSync } from "node:fs";
import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// The released versions' docs are snapshots (versions.json, made on each release); the current docs
// are the next release's, shown as such until one is cut.
const released = existsSync(new URL("./versions.json", import.meta.url));

const config: Config = {
  title: "moodle-mcp",
  tagline: "Let an AI agent work in your Moodle courses as you, with your own login.",
  favicon: "img/logo.svg",

  url: "https://falkenslab.github.io",
  baseUrl: "/moodle-mcp/",
  organizationName: "falkenslab",
  projectName: "moodle-mcp",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  markdown: { mermaid: true, hooks: { onBrokenMarkdownLinks: "throw" } },

  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    localeConfigs: { en: { label: "English" }, es: { label: "Español" } },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          path: "content",
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editLocalizedFiles: true,
          editUrl: ({ locale, docPath }) =>
            locale === "en"
              ? `https://github.com/falkenslab/moodle-mcp/edit/main/docs/content/${docPath}`
              : `https://github.com/falkenslab/moodle-mcp/edit/main/docs/i18n/${locale}/docusaurus-plugin-content-docs/current/${docPath}`,
          ...(released && {
            versions: { current: { label: "Next (unreleased)", path: "next", banner: "unreleased" } },
          }),
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    "@docusaurus/theme-mermaid",
    [
      "@easyops-cn/docusaurus-search-local",
      { hashed: true, language: ["en", "es"], docsDir: "content", docsRouteBasePath: "/", indexBlog: false, highlightSearchTermsOnTargetPage: true },
    ],
  ],

  themeConfig: {
    image: "img/logo-512.png",
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "moodle-mcp",
      logo: { alt: "moodle-mcp", src: "img/logo.svg" },
      items: [
        { type: "docSidebar", sidebarId: "guide", position: "left", label: "Guide" },
        { type: "doc", docId: "use-cases/index", position: "left", label: "Use cases" },
        { type: "doc", docId: "reference/tools", position: "left", label: "Tools" },
        { type: "docsVersionDropdown", position: "right" },
        { type: "localeDropdown", position: "right" },
        { href: "https://www.npmjs.com/package/@falkenslab/moodle-mcp", label: "npm", position: "right" },
        { href: "https://github.com/falkenslab/moodle-mcp", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "Getting started", to: "/getting-started/requirements" },
            { label: "Use cases", to: "/use-cases" },
            { label: "Students' privacy", to: "/privacy" },
            { label: "Releases", to: "/releases" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "GitHub", href: "https://github.com/falkenslab/moodle-mcp" },
            { label: "Issues", href: "https://github.com/falkenslab/moodle-mcp/issues" },
            { label: "npm", href: "https://www.npmjs.com/package/@falkenslab/moodle-mcp" },
          ],
        },
        {
          title: "Related",
          items: [
            { label: "moodle-driver", href: "https://falkenslab.github.io/moodle-driver/" },
            { label: "Model Context Protocol", href: "https://modelcontextprotocol.io" },
            { label: "Moodle", href: "https://moodle.org" },
          ],
        },
      ],
      copyright: `MIT licensed. Copyright © ${new Date().getFullYear()} Francisco Vargas Ruiz.<br/>Made with 💖 by Falken's Lab Team`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "toml", "powershell"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
