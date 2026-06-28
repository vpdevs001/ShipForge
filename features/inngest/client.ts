import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ship-forge",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
