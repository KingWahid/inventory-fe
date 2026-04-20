"use client";

import { Alert } from "@heroui/react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function ApiErrorAlert({ title, children }: Props) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
