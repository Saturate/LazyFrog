# Automation flow

Here is the state flow described in an easy readable way.

```

- IDLE
- RUNNING
  - Check if mission window is already opened
    - If opened check if it's completed
      - If not start automation for game
  - LOOP
    - Find next mission in queue
    - Navigate to mission (checks if we are already there)
    - wait for game to load
    - start automation
        - completion (marking as cleared)
```

See `botStateMachine.ts` for implemented state.
