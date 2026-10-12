import { useState, type ReactNode } from "react";
import { translate } from "@docusaurus/Translate";
import styles from "./styles.module.css";

// A terminal window with real, selectable text: lines starting with the prompt are commands (the copy
// button copies them, without the prompt), the rest is their output. ✔ and ✘ marks are coloured.
//   <Terminal title="PowerShell" prompt="PS>">{`PS> claude mcp list\nmoodle: … - ✔ Connected`}</Terminal>
export default function Terminal({ title = "Terminal", prompt = "$", children }: { title?: string; prompt?: string; children: string }): ReactNode {
  const lines = children.replace(/^\n+|\n+$/g, "").split("\n");
  const commands = lines.filter((line) => line.startsWith(`${prompt} `)).map((line) => line.slice(prompt.length + 1));
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      .writeText(commands.join("\n"))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  return (
    <div className={styles.window}>
      <div className={styles.bar}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.title}>{title}</span>
        {commands.length > 0 && (
          <button type="button" className={styles.copy} onClick={copy}>
            {copied ? "✔" : translate({ id: "terminal.copy", message: "Copy", description: "The button that copies a terminal's commands" })}
          </button>
        )}
      </div>
      <pre className={styles.body}>
        {lines.map((line, i) =>
          line.startsWith(`${prompt} `) ? (
            <div key={i}>
              <span className={styles.prompt}>{prompt} </span>
              <span className={styles.command}>{line.slice(prompt.length + 1)}</span>
            </div>
          ) : (
            <div key={i} className={styles.output}>
              {line.split(/(✔[^-]*|✘[^-]*)/).map((part, j) => (
                <span key={j} className={part.startsWith("✔") ? styles.ok : part.startsWith("✘") ? styles.bad : undefined}>
                  {part}
                </span>
              ))}
              {line === "" && " "}
            </div>
          ),
        )}
      </pre>
    </div>
  );
}
