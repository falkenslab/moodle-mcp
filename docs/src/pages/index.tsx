import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import Screenshot from "@site/src/components/Screenshot";
import Terminal from "@site/src/components/Terminal";
import styles from "./index.module.css";

const FEATURES: { title: string; text: string }[] = [
  {
    title: translate({ id: "home.feature.login.title", message: "Your login, your browser" }),
    text: translate({
      id: "home.feature.login.text",
      message: "You log in yourself, once, in a browser window it opens, with single sign-on and two-factor if your site uses them. It never sees your password, and needs nothing installed in Moodle.",
    }),
  },
  {
    title: translate({ id: "home.feature.privacy.title", message: "Students stay anonymous" }),
    text: translate({
      id: "home.feature.privacy.text",
      message: "The AI sees other people as aliases such as A-7KQ2XM, never their names. Only you can turn an alias back into a name, on your own computer.",
    }),
  },
  {
    title: translate({ id: "home.feature.limits.title", message: "You set the limits" }),
    text: translate({
      id: "home.feature.limits.text",
      message: "Only a teacher's or a student's tools, only reading, only building content: the agent can narrow its limits, never widen them. It asks before changing anything.",
    }),
  },
  {
    title: translate({ id: "home.feature.teacher.title", message: "For teachers" }),
    text: translate({
      id: "home.feature.teacher.text",
      message: "Grade with your rubrics, build quizzes from your questions, answer the forum, follow who's falling behind, create pages with your images.",
    }),
  },
  {
    title: translate({ id: "home.feature.student.title", message: "For students" }),
    text: translate({
      id: "home.feature.student.text",
      message: "Know what's due across your courses, turn the course's notes into study sheets, review your quizzes and understand your mistakes.",
    }),
  },
  {
    title: translate({ id: "home.feature.clients.title", message: "Claude, Codex and more" }),
    text: translate({
      id: "home.feature.clients.text",
      message: "Works with Claude Code, Claude Desktop, Codex and any app that supports MCP, on Windows, macOS and Linux, with any Moodle 5 site.",
    }),
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title={translate({ id: "home.title", message: "Your AI agent in Moodle" })}
      description={translate({ id: "home.description", message: "moodle-mcp lets an AI agent like Claude or Codex work in your Moodle courses as you, with your own login." })}
    >
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>
            <img className={styles.logo} src={useBaseUrl("/img/logo.svg")} alt="" /> moodle-mcp
          </h1>
          <p className={styles.tagline}>
            <Translate id="home.tagline">Let an AI agent work in your Moodle courses as you, with your own login.</Translate>
            <br />
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
          <div className={styles.install}>
            <Terminal>{"$ claude mcp add moodle -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp"}</Terminal>
          </div>
        </div>
      </header>
      <main className="container margin-vert--xl">
        <div className="row">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="col col--4 margin-bottom--lg">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
        <div className="row margin-top--lg">
          <div className="col col--10 col--offset-1">
            <h2 className={styles.center}>
              <Translate id="home.example">Ask in your own words</Translate>
            </h2>
            <p className={styles.center}>
              <Translate id="home.example.text">A real session: Claude Code finds what needs grading, proposes a grade with the rubric, and saves it once you agree.</Translate>
            </p>
            <Screenshot app="Claude Code" session="grading" alt={translate({ id: "home.example.alt", message: "Claude Code grading a submission in Moodle with moodle-mcp" })} />
          </div>
        </div>
      </main>
    </Layout>
  );
}
