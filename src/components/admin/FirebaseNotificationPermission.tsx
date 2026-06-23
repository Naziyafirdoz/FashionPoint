"use client";

import { useEffect, useRef } from "react";
import { requestNotificationPermission } from "@/lib/firebase-messaging";

export default function FirebaseNotificationPermission() {
  const registerAttemptedRef = useRef(false);

  useEffect(() => {
    console.log("FirebaseNotificationPermission mounted");

    async function setup() {
      console.log("Calling requestNotificationPermission");

      const token = await requestNotificationPermission();

      console.log("requestNotificationPermission finished");

      if (token) {
        console.log("Firebase token:", token);

        if (registerAttemptedRef.current) {
          return;
        }

        registerAttemptedRef.current = true;

        try {
          const res = await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          });

          if (!res.ok) {
            throw new Error(`Register failed with status ${res.status}`);
          }

          console.log("[push] token registered");
        } catch (error) {
          registerAttemptedRef.current = false;
          console.error("[push] register failed", error);
        }
      } else {
        console.log("No token returned");
      }
    }

    void setup();
  }, []);

  return null;
}
