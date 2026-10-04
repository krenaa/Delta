"use client";

import { useBackendHeartbeat } from "../utils/useBackendHeartbeat";

export default function BackendHeartbeat() {
  useBackendHeartbeat();
  return null;
}
