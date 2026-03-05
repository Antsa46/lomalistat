import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
}

export function Container({ children }: ContainerProps) {
  return <main className="w-full flex-1 px-4 pb-8 pt-4 md:px-6">{children}</main>;
}
