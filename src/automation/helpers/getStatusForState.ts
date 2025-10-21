import { BotContext } from "../botStateMachine";

/**
 * Get human-readable status text for current state
 */
export function getStatusForState(state: string, context: BotContext): string {
  switch (state) {
    case "idle":
      // Show reason for being idle if available
      if (context.completionReason === "no_missions") {
        return "Idle - No more missions available";
      } else if (context.completionReason === "stopped") {
        return "Idle - Stopped by user";
      } else if (context.completionReason === "error") {
        return `Idle - Stopped due to error: ${
          context.errorMessage || "Unknown"
        }`;
      }
      return "Idle";
    case "starting":
      return "Starting...";
    case "navigating":
      return "Navigating to mission...";
    case "waitingForGame":
      return "Waiting for game to load...";
    case "openingGame":
      return "Opening game...";
    case "gameReady":
      return "Game ready, starting automation...";
    case "running":
      return "Running automation";
    case "completing":
      return "Mission completed, finding next...";
    case "error":
      return `Error: ${context.errorMessage || "Unknown error"}`;
    default:
      return "Unknown state";
  }
}
