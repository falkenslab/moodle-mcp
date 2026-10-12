import type { ReactNode } from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";

// A screenshot in a window frame, titled with the app it shows. A session's screenshot exists once per
// language: give `session` (the use case's id) and the page's language picks <id>.<locale>.png.
//   <Screenshot app="Claude Code" session="grading" alt="…" />
//   <Screenshot app="Moodle" src="/img/moodle/grading.png" alt="…" />
export default function Screenshot({ app, session, src, alt }: { app: string; session?: string; src?: string; alt: string }): ReactNode {
  const { i18n } = useDocusaurusContext();
  const url = useBaseUrl(session ? `/img/sessions/${session}.${i18n.currentLocale}.png` : (src ?? ""));
  const dark = app !== "Moodle";
  return (
    <figure className={`${styles.window} ${dark ? styles.dark : styles.light}`}>
      <div className={styles.bar}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.title}>{app}</span>
      </div>
      <img className={styles.image} src={url} alt={alt} loading="lazy" />
    </figure>
  );
}
