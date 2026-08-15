import { Effect } from "effect";

/** Domain effects live here. Timer / cycle logic is out of scope for #11. */
export const domainReady: Effect.Effect<true> = Effect.succeed(true);
