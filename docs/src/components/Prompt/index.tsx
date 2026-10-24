import { useState, type ReactNode } from "react";
import { translate } from "@docusaurus/Translate";
import styles from "./styles.module.css";

// What you'd type to the agent, shown as an AI app's message box: the text as typed, and the send
// button, which copies it.
//   <Prompt>{`List my Moodle courses.`}</Prompt>
export default function Prompt({ children }: { children: string }): ReactNode {
  const text = children.replace(/^\n+|\n+$/g, "");
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  const label = translate({ id: "prompt.copy", message: "Copy this request", description: "The send button of an example request, which copies it" });
  return (
    <figure className={styles.box}>
      <p className={styles.text}>{text}</p>
      <div className={styles.bar} aria-hidden="true">
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className={styles.spacer} />
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </div>
      <button type="button" className={styles.send} onClick={copy} title={label} aria-label={label}>
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5L19 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        )}
      </button>
    </figure>
  );
}
