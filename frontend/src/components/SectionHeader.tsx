import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}

export function SectionHeader({ eyebrow, title, sub, actions }: Props) {
  return (
    <div className="rh-sec-head">
      <div className="rh-sec-eyebrow">{eyebrow}</div>
      <div className="rh-sec-titles">
        <h2 className="rh-sec-title">{title}</h2>
        {sub && <p className="rh-sec-sub">{sub}</p>}
      </div>
      {actions ? <div className="rh-sec-actions">{actions}</div> : <div />}
    </div>
  );
}
