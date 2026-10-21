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
            versions: { current: { label: "Next", path: "next", banner: "unreleased" } },
          }),
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  // Falken's Lab's faces (the falkenslab-site-style look: src/css/custom.css).
  stylesheets: [
    { href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" },
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
        { type: "doc", docId: "getting-started/requirements", position: "left", label: "Get started" },
        { type: "doc", docId: "use-cases/index", position: "left", label: "Use cases" },
        { type: "doc", docId: "privacy", position: "left", label: "Privacy" },
        { type: "doc", docId: "limits", position: "left", label: "Limits" },
        { type: "doc", docId: "settings", position: "left", label: "Settings" },
        { type: "doc", docId: "reference/tools", position: "left", label: "Tools" },
        {
          type: "dropdown",
          label: "More",
          position: "left",
          items: [
            { type: "doc", docId: "intro", label: "What is moodle-mcp?" },
            { type: "doc", docId: "several-sites", label: "Several sites" },
            { type: "doc", docId: "troubleshooting", label: "Troubleshooting" },
            { type: "doc", docId: "releases", label: "Releases" },
            { type: "doc", docId: "developers/index", label: "For developers" },
            { href: "https://www.npmjs.com/package/@falkenslab/moodle-mcp", label: "npm" },
          ],
        },
        { type: "docsVersionDropdown", position: "right" },
        { type: "localeDropdown", position: "right" },
        { href: "https://github.com/falkenslab/moodle-mcp", position: "right", className: "header-github-link", "aria-label": "GitHub" },
      ],
    },
    // Only the signature (falkenslab-docs): the sections are in the navbar.
    footer: {
      style: "light",
      copyright: "Made with 💖 by Falken's Lab Team",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "toml", "powershell"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
