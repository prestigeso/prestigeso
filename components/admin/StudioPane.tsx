"use client";
import { useState, type ReactNode } from "react";
import s from "./StudioWorkbench.module.css";

/** Lazy first mount, then retain draft fields when the navigation changes. */
export default function StudioPane({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const [visited, setVisited] = useState(active);
  if (active && !visited) setVisited(true);
  return visited || active ? (
    <div className={s.workbench} hidden={!active}>
      {children}
    </div>
  ) : null;
}
