import { useState, type ReactNode } from "react";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import Screenshot from "@site/src/components/Screenshot";
import Terminal from "@site/src/components/Terminal";
import styles from "./index.module.css";

const SITE = "https://campus.example.org";

type Os = "unix" | "windows";
type Method = "cli" | "agent" | "file";
// One way to add moodle-mcp to one app: what to do, the commands or the file, and what comes next.
type Way = { intro: ReactNode; body: (os: Os) => ReactNode; after?: ReactNode };
type Client = { id: string; name: string; guide: string; ways: Partial<Record<Method, Way>> };

const npx = (os: Os) => (os === "windows" ? "cmd /c npx -y @falkenslab/moodle-mcp" : "npx -y @falkenslab/moodle-mcp");
const shell = (os: Os, lines: string[]) =>
  os === "windows" ? (
    <Terminal title="PowerShell" prompt="PS>">{lines.map((line) => `PS> ${line}`).join("\n")}</Terminal>
  ) : (
    <Terminal>{lines.map((line) => `$ ${line}`).join("\n")}</Terminal>
  );
const chat = (app: string, lines: string[]) => <Terminal title={app} prompt=">">{lines.map((line) => `> ${line}`).join("\n")}</Terminal>;
const json = (os: Os, title: string) => (
  <CodeBlock language="json" title={title}>
    {JSON.stringify(
      {
        mcpServers: {
          moodle: {
            command: os === "windows" ? "cmd" : "npx",
            args: [...(os === "windows" ? ["/c", "npx"] : []), "-y", "@falkenslab/moodle-mcp"],
            env: { MOODLE_URL: SITE },
          },
        },
      },
      null,
      2,
    )}
  </CodeBlock>
);
const c = (text: string) => <code>{text}</code>;
const plugin = (
  <Translate id="home.install.plugin" values={{ teacher: c("moodle-teacher"), student: c("moodle-student") }}>
    {"{teacher} is the plugin for the courses you teach, {student} for those you take: the same server, with skills that say how to do each job well. It asks for your Moodle sites when it's installed."}
  </Translate>
);

const CLIENTS: Client[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    guide: "/getting-started/claude-code",
    ways: {
      cli: {
        intro: <Translate id="home.install.claudeCode.cli" values={{ scope: c("--scope user") }}>
            {"In a terminal, with your Moodle's address. {scope} makes it available in every folder."}
          </Translate>,
        body: (os) => shell(os, [`claude mcp add moodle --scope user -e MOODLE_URL=${SITE} -- ${npx(os)}`, "claude mcp list"]),
      },
      agent: {
        intro: <Translate id="home.install.claudeCode.agent">Inside Claude Code, as a plugin from Falken's Lab's marketplace:</Translate>,
        body: () => chat("Claude Code", ["/plugin marketplace add falkenslab/agent-extensions", "/plugin install moodle-teacher@falkenslab"]),
        after: plugin,
      },
      file: {
        intro: (
          <Translate id="home.install.claudeCode.file" values={{ project: c(".mcp.json"), user: c("~/.claude.json"), key: c("mcpServers") }}>
            {"In {project} in a project's folder (only there; Claude asks you to trust it once), or under {key} in {user} (every folder):"}
          </Translate>
        ),
        body: (os) => json(os, ".mcp.json"),
      },
    },
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    guide: "/getting-started/claude-desktop",
    ways: {
      file: {
        intro: (
          <Translate id="home.install.claudeDesktop.file" values={{ file: c("claude_desktop_config.json"), path: <strong>Settings → Developer → Edit Config</strong> }}>
            {"{path} opens {file}. Add this, then quit Claude Desktop and open it again:"}
          </Translate>
        ),
        body: (os) => json(os, "claude_desktop_config.json"),
      },
    },
  },
  {
    id: "codex",
    name: "Codex",
    guide: "/getting-started/codex",
    ways: {
      cli: {
        intro: <Translate id="home.install.codex.cli">In a terminal, with your Moodle's address. Codex CLI, its VS Code extension and the Codex app share it.</Translate>,
        body: (os) => shell(os, [`codex mcp add moodle --env MOODLE_URL=${SITE} -- ${npx(os)}`, "codex mcp list"]),
        after: (
          <Translate id="home.install.codex.timeouts">
            Then give it more time to start and to work: the two timeout lines of the configuration file (By hand).
          </Translate>
        ),
      },
      agent: {
        intro: <Translate id="home.install.codex.agent" values={{ plugins: c("/plugins") }}>
            {"Add Falken's Lab's marketplace once, then install the plugin from inside Codex with {plugins}:"}
          </Translate>,
        body: (os) => (
          <>
            {shell(os, ["codex plugin marketplace add falkenslab/agent-extensions"])}
            {chat("Codex", ["/plugins"])}
          </>
        ),
        after: (
          <Translate id="home.install.codex.plugin" values={{ teacher: c("moodle-teacher"), student: c("moodle-student") }}>
            {"Choose {teacher} or {student}, only one of them. Codex has no plugin settings: the agent asks for your Moodle's address in the chat."}
          </Translate>
        ),
      },
      file: {
        intro: <Translate id="home.install.codex.file" values={{ file: c("~/.codex/config.toml") }}>
            {"In {file}, with time to start and to work:"}
          </Translate>,
        body: (os) => (
          <CodeBlock language="toml" title="~/.codex/config.toml">
            {[
              "[mcp_servers.moodle]",
              `command = "${os === "windows" ? "cmd" : "npx"}"`,
              `args = [${[...(os === "windows" ? ["/c", "npx"] : []), "-y", "@falkenslab/moodle-mcp"].map((arg) => `"${arg}"`).join(", ")}]`,
              "startup_timeout_sec = 120",
              "tool_timeout_sec = 600",
              "",
              "[mcp_servers.moodle.env]",
              `MOODLE_URL = "${SITE}"`,
            ].join("\n")}
          </CodeBlock>
        ),
      },
    },
  },
  {
    id: "agent-kit",
    name: "agent-kit",
    guide: "/next/getting-started/agent-kit",
    ways: {
      cli: {
        intro: (
          <Translate id="home.install.agentKit.cli" values={{ kit: <a href="https://falkenslab.github.io/agent-kit/">agent-kit</a> }}>
            {"Agents built on {kit}, Falken's Lab's kit, install it as an extension with their own command: miyagi for teachers, padawan for students, or yours."}
          </Translate>
        ),
        body: (os) => shell(os, ["miyagi extension add moodle-teacher@falkenslab"]),
        after: (
          <Translate id="home.install.agentKit.marketplace" values={{ command: c("my-agent extension marketplace add falkenslab/agent-extensions") }}>
            {"An agent whose own marketplace isn't Falken's Lab's adds it first: {command}."}
          </Translate>
        ),
      },
      agent: {
        intro: <Translate id="home.install.agentKit.agent">In the agent's chat, and it's there in the same conversation:</Translate>,
        body: () => chat("miyagi", ["/extensions install moodle-teacher@falkenslab", "/extensions reload"]),
        after: plugin,
      },
      file: {
        intro: <Translate id="home.install.agentKit.file">In the code of an agent of your own, among its MCP servers:</Translate>,
        body: () => (
          <CodeBlock language="ts" title="agent.ts">
            {[
              "const spec: AgentSpec<BaseSessionConfig> = {",
              "  // …",
              "  buildMcpServers: () => ({",
              "    moodle: {",
              '      command: "npx",',
              '      args: ["-y", "@falkenslab/moodle-mcp"],',
              `      env: { MOODLE_URL: "${SITE}", MOODLE_MCP_ROLE: "teacher" },`,
              "    },",
              "  }),",
              "};",
            ].join("\n")}
          </CodeBlock>
        ),
      },
    },
  },
];

const METHODS: { id: Method; label: string }[] = [
  { id: "cli", label: translate({ id: "home.install.method.cli", message: "Command line" }) },
  { id: "agent", label: translate({ id: "home.install.method.agent", message: "From the agent" }) },
  { id: "file", label: translate({ id: "home.install.method.file", message: "By hand" }) },
];

function Install(): ReactNode {
  const [clientId, setClientId] = useState(CLIENTS[0].id);
  const [method, setMethod] = useState<Method>("cli");
  const [os, setOs] = useState<Os>("unix");
  const client = CLIENTS.find((c) => c.id === clientId)!;
  const methods = METHODS.filter((m) => client.ways[m.id]);
  const shown = client.ways[method] ? method : methods[0].id;
  const way = client.ways[shown]!;
  return (
    <div className={styles.install}>
      <div className={styles.tabs} role="tablist">
        {CLIENTS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={c.id === clientId} className={styles.tab} onClick={() => setClientId(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <div className={styles.options}>
        <div className={styles.seg} role="group" aria-label={translate({ id: "home.install.how", message: "How" })}>
          {methods.map((m) => (
            <button key={m.id} type="button" aria-pressed={m.id === shown} onClick={() => setMethod(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className={styles.seg} role="group" aria-label={translate({ id: "home.install.os", message: "Operating system" })}>
          <button type="button" aria-pressed={os === "unix"} onClick={() => setOs("unix")}>
            macOS · Linux
          </button>
          <button type="button" aria-pressed={os === "windows"} onClick={() => setOs("windows")}>
            Windows
          </button>
        </div>
      </div>
      <p className={styles.way}>{way.intro}</p>
      {way.body(os)}
      {way.after && <p className={styles.way}>{way.after}</p>}
      <p className={styles.next}>
        <Translate id="home.install.next">Then ask “List my Moodle courses”: a browser window opens for you to log in, once.</Translate>{" "}
        <Link to={client.guide}>
          <Translate id="home.install.guide">Step by step →</Translate>
        </Link>
      </p>
    </div>
  );
}

const FEATURES: { icon: string; title: string; text: string }[] = [
  {
    icon: "🔐",
    title: translate({ id: "home.feature.login.title", message: "Your login, your browser" }),
    text: translate({
      id: "home.feature.login.text",
      message: "You log in yourself, once, in a browser window it opens, with single sign-on and two-factor if your site uses them. It never sees your password, and needs nothing installed in Moodle.",
    }),
  },
  {
    icon: "🕶️",
    title: translate({ id: "home.feature.privacy.title", message: "Students stay anonymous" }),
    text: translate({
      id: "home.feature.privacy.text",
      message: "The AI sees other people as aliases such as A-7KQ2XM, never their names. Only you can turn an alias back into a name, on your own computer.",
    }),
  },
  {
    icon: "🎚️",
    title: translate({ id: "home.feature.limits.title", message: "You set the limits" }),
    text: translate({
      id: "home.feature.limits.text",
      message: "Only a teacher's or a student's tools, only reading, only building content: the agent can narrow its limits, never widen them. It asks before changing anything.",
    }),
  },
  {
    icon: "🧑‍🏫",
    title: translate({ id: "home.feature.teacher.title", message: "For teachers" }),
    text: translate({
      id: "home.feature.teacher.text",
      message: "Grade with your rubrics, build quizzes from your questions, answer the forum, follow who's falling behind, create pages with your images.",
    }),
  },
  {
    icon: "🎒",
    title: translate({ id: "home.feature.student.title", message: "For students" }),
    text: translate({
      id: "home.feature.student.text",
      message: "Know what's due across your courses, turn the course's notes into study sheets, review your quizzes and understand your mistakes.",
    }),
  },
  {
    icon: "🧩",
    title: translate({ id: "home.feature.clients.title", message: "Claude, Codex and more" }),
    text: translate({
      id: "home.feature.clients.text",
      message: "Works with Claude Code, Claude Desktop, Codex, agents built on agent-kit and any app that supports MCP, on Windows, macOS and Linux, with Moodle 4.5 and 5.x.",
    }),
  },
];

// The settings at a glance: the variable, its values (the default first) and what it's for.
const SETTINGS: { name: string; values: string; text: string; next?: boolean }[] = [
  { name: "MOODLE_URL", values: SITE, text: translate({ id: "home.settings.url", message: "Your Moodle site. Without it, the agent asks you." }) },
  { name: "MOODLE_MCP_SITES", values: "school=https://…,uni=https://…", text: translate({ id: "home.settings.sites", message: "Several sites, by name; the first is where it starts." }) },
  { name: "MOODLE_MCP_ROLE", values: "all · teacher · student", text: translate({ id: "home.settings.role", message: "Only the tools for your role: fewer tools, better choices." }) },
  { name: "MOODLE_MCP_ACCESS", values: "write · read", text: translate({ id: "home.settings.access", message: "read: it only looks, never changes anything." }) },
  { name: "MOODLE_MCP_STUDENT_DATA", values: "pseudonymize · block · clear", text: translate({ id: "home.settings.studentData", message: "Other people as aliases, not at all, or by name (only for an AI on your computer)." }) },
  { name: "MOODLE_MCP_SCOPES", values: "all · content · teacher · student", text: translate({ id: "home.settings.scopes", message: "The kinds of data it may touch; content builds courses and never sees students' work." }) },
  { name: "MOODLE_MCP_CONFIRM", values: "elicit · client", text: translate({ id: "home.settings.confirm", message: "Who asks you before what can't be undone: moodle-mcp, or your app." }), next: true },
  { name: "MOODLE_MCP_ADVANCED", values: "false · true", text: translate({ id: "home.settings.advanced", message: "true adds BigBlueButton, competencies, LTI, the content bank, notes and blocks." }) },
  { name: "MOODLE_MCP_HEADLESS", values: "true · false", text: translate({ id: "home.settings.headless", message: "false works in a visible window. Logging in always shows one." }) },
  { name: "MOODLE_MCP_CHANNEL", values: "msedge · chrome · chromium · firefox", text: translate({ id: "home.settings.channel", message: "Which browser: Edge, then Chrome, then Chromium, unless you choose." }) },
  { name: "MOODLE_MCP_PROFILE_DIR", values: "~/.moodle-mcp/profile", text: translate({ id: "home.settings.profile", message: "The folder that keeps your login." }) },
  { name: "MOODLE_MCP_DOWNLOAD_BROWSER", values: "true · false", text: translate({ id: "home.settings.download", message: "false never downloads Chromium when there's no Edge or Chrome." }) },
  { name: "MOODLE_MCP_TRAIL", values: "realistic · fast", text: translate({ id: "home.settings.trail", message: "As a student: real pages at a reader's pace (views and completion count), or fast." }) },
];

// Where each setting goes, when you add moodle-mcp and afterwards.
const SET_WAYS: { title: string; items: { app: string; how: string }[] }[] = [
  {
    title: translate({ id: "home.settings.start", message: "When you add it" }),
    items: [
      { app: "Claude Code", how: translate({ id: "home.settings.start.claudeCode", message: "-e NAME=value, one per setting, in claude mcp add." }) },
      { app: "Codex", how: translate({ id: "home.settings.start.codex", message: "--env NAME=value in codex mcp add." }) },
      { app: translate({ id: "home.settings.files", message: "Files" }), how: translate({ id: "home.settings.start.files", message: "In env (JSON) or [mcp_servers.moodle.env] (TOML)." }) },
      { app: translate({ id: "home.settings.plugins", message: "Plugins" }), how: translate({ id: "home.settings.start.plugins", message: "They ask when installed: sites, headless, access, student_data." }) },
    ],
  },
  {
    title: translate({ id: "home.settings.later", message: "Later" }),
    items: [
      { app: "Claude Code", how: translate({ id: "home.settings.later.claudeCode", message: "claude mcp remove moodle, and add it again; or edit the file; a plugin's in /plugin." }) },
      { app: "Claude Desktop", how: translate({ id: "home.settings.later.claudeDesktop", message: "Edit the file, and restart it." }) },
      { app: "Codex", how: translate({ id: "home.settings.later.codex", message: "Edit ~/.codex/config.toml; a new session takes it." }) },
      { app: "agent-kit", how: translate({ id: "home.settings.later.agentKit", message: "/extensions config moodle-teacher access=read, there and then." }) },
    ],
  },
  {
    title: translate({ id: "home.settings.chat", message: "During a chat" }),
    items: [
      {
        app: translate({ id: "home.settings.chat.any", message: "Any app" }),
        how: translate({ id: "home.settings.chat.text", message: "Just ask: “for this chat, only read”. The agent can make its limits stricter, never looser than yours." }),
      },
    ],
  },
];

const SECTIONS: { to: string; icon: string; title: string; text: string }[] = [
  { to: "/getting-started/requirements", icon: "🚀", title: translate({ id: "home.docs.start", message: "Getting started" }), text: translate({ id: "home.docs.start.text", message: "What you need, each app step by step, and your first login." }) },
  { to: "/use-cases", icon: "💬", title: translate({ id: "home.docs.cases", message: "Use cases" }), text: translate({ id: "home.docs.cases.text", message: "Real sessions of a teacher and a student, with what to ask." }) },
  { to: "/privacy", icon: "🕶️", title: translate({ id: "home.docs.privacy", message: "Students' privacy" }), text: translate({ id: "home.docs.privacy.text", message: "Aliases, what the AI sees, and turning an alias into a name." }) },
  { to: "/limits", icon: "🎚️", title: translate({ id: "home.docs.limits", message: "Limits" }), text: translate({ id: "home.docs.limits.text", message: "Role, read only, scopes, advanced tools and confirmations." }) },
  { to: "/settings", icon: "⚙️", title: translate({ id: "home.docs.settings", message: "Settings" }), text: translate({ id: "home.docs.settings.text", message: "Every setting in detail, and where it goes in each app." }) },
  { to: "/several-sites", icon: "🌐", title: translate({ id: "home.docs.sites", message: "Several sites" }), text: translate({ id: "home.docs.sites.text", message: "Your school's and your university's Moodle, and copying between them." }) },
  { to: "/reference/tools", icon: "🧰", title: translate({ id: "home.docs.tools", message: "Tools" }), text: translate({ id: "home.docs.tools.text", message: "Every tool the agent gets, with its inputs." }) },
  { to: "/troubleshooting", icon: "🩺", title: translate({ id: "home.docs.troubleshooting", message: "Troubleshooting" }), text: translate({ id: "home.docs.troubleshooting.text", message: "When it doesn't start, doesn't log in or doesn't find something." }) },
  { to: "/developers", icon: "🛠️", title: translate({ id: "home.docs.developers", message: "For developers" }), text: translate({ id: "home.docs.developers.text", message: "How it's built, tested and released." }) },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title={translate({ id: "home.title", message: "Your AI agent in Moodle" })}
      description={translate({ id: "home.description", message: "moodle-mcp lets an AI agent like Claude or Codex work in your Moodle courses as you, with your own login." })}
    >
      <header className="fl-hero">
        <span className="fl-eyebrow">Falken's Lab · MCP</span>
        <h1>
          <Translate id="home.headline">Your AI agent in Moodle</Translate>
        </h1>
        <p>
          <Translate id="home.tagline">Let an AI agent work in your Moodle courses as you, with your own login.</Translate>{" "}
          <Translate id="home.tagline2">Your students stay anonymous to the AI, and you decide what it can do.</Translate>
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/getting-started/requirements">
            <Translate id="home.start">Get started</Translate>
          </Link>
          <Link className="button button--secondary button--lg" to="/use-cases">
            <Translate id="home.cases">See it at work</Translate>
          </Link>
        </div>
        <Install />
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <div className="fl-cards">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="fl-card">
                <span className="icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.title}>
            <Translate id="home.example">Ask in your own words</Translate>
          </h2>
          <p className={styles.lead}>
            <Translate id="home.example.text">A real session: Claude Code finds what needs grading, proposes a grade with the rubric, and saves it once you agree.</Translate>
          </p>
          <Screenshot app="Claude Code" session="grading" alt={translate({ id: "home.example.alt", message: "Claude Code grading a submission in Moodle with moodle-mcp" })} />
        </section>

        <section className={styles.section} id="settings">
          <h2 className={styles.title}>
            <Translate id="home.settings.title">Settings, in short</Translate>
          </h2>
          <p className={styles.lead}>
            <Translate id="home.settings.lead">Nothing is required, and each has a sensible default (the first value). They're environment variables of the server, so they go where you added it.</Translate>
          </p>
          <div className={styles.settings}>
            {SETTINGS.map((setting) => (
              <div key={setting.name} className={styles.setting}>
                <code>{setting.name}</code>
                <span className={styles.values}>{setting.values}</span>
                <span className={styles.what}>
                  {setting.text}
                  {setting.next && (
                    <span className={styles.badge}>
                      <Translate id="home.settings.nextBadge">next release</Translate>
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.setWays}>
            {SET_WAYS.map((group) => (
              <div key={group.title} className="fl-card">
                <h3>{group.title}</h3>
                <dl className={styles.ways}>
                  {group.items.map((item) => (
                    <div key={item.app}>
                      <dt>{item.app}</dt>
                      <dd>{item.how}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className={styles.lead}>
            <Link to="/settings">
              <Translate id="home.settings.more">Every setting in detail →</Translate>
            </Link>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.title}>
            <Translate id="home.docs.title">The manual</Translate>
          </h2>
          <div className="fl-cards">
            {SECTIONS.map((section) => (
              <Link key={section.to} to={section.to} className={`fl-card ${styles.link}`}>
                <span className="icon" aria-hidden="true">
                  {section.icon}
                </span>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
