/**
 * Get human-readable status text for current state
 */
export function getStatusText(state: string, context: any): string {
  switch (state) {
    case "idle":
      // Show reason for being idle if available
      if (context?.completionReason === "no_missions") {
        return "Idle - No more missions";
      } else if (context?.completionReason === "stopped") {
        return "Idle - Stopped";
      } else if (context?.completionReason === "error") {
        return `Idle - Error: ${context?.errorMessage || "Unknown"}`;
      }
      return "Idle";
    case "starting":
      return "Starting...";
    case "navigating":
      return "Navigating...";
    case "waitingForGame":
      return "Waiting for game...";
    case "openingGame":
      return "Opening game...";
    case "gameReady":
      return "Starting automation...";
    case "running":
      // Show encounter progress if available
      if (context?.gameState) {
        const { postId, encounterCurrent, encounterTotal } = context.gameState;

        if (encounterTotal > 0) {
          return `Running - ${postId || "???"} - Encounter ${encounterCurrent + 1}/${encounterTotal}`;
        }
        return `Running - ${postId || "???"}`;
      }
      return "Running";
    case "completing":
      return "Finding next mission...";
    case "waitingForDialogClose":
      return "Waiting for mission to complete...";
    case "error":
      return `Error: ${context?.errorMessage || "Unknown"}`;
    default:
      return "Unknown state";
  }
}
