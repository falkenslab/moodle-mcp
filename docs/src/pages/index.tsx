import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import Layout from "@theme/Layout";
import Screenshot from "@site/src/components/Screenshot";
import styles from "./index.module.css";

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
