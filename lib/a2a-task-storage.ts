/**
 * Shared task storage for A2A protocol agents
 * In production, this should be replaced with a database
 */

import { A2ATask } from "./a2a-protocol";

// In-memory task storage (in production, use a database)
export const tasks = new Map<string, A2ATask>();
export const agentExecutors = new Map<string, any>();

