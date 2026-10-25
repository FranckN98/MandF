"use client";

import { Button } from "@/components/ui/Button";
import { requestRsvpPrefill } from "@/lib/rsvp-bus";

export function LodgingInterestButton() {
  return (
    <Button variant="primary" onClick={() => requestRsvpPrefill({ attendance: "yes", accommodation: "interested" })}>
      Je suis intéressé(e)
    </Button>
  );
}
