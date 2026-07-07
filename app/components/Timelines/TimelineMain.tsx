"use client";
import React from "react";
import Timeline from "./Timeline";

// Community moments only — workshops live in the track cards on /Events.
const TimelineMain = () => {
  const events = [
    {
      title: "Tea Session",
      description:
        "Meet mentors and fellow members over tea — ideas, questions, no agenda.",
      imageUrl: "/images/TeaSession.jpg",
    },
    {
      title: "Alumni Networking Night",
      description:
        "A night with DAP alumni now working across the analytics industry.",
      imageUrl: "/images/ANN.jpg",
    },
    {
      title: "BIA Picnic",
      description: "An afternoon outdoors with the whole club. Bring a mat.",
      imageUrl: "/images/biaPicnic.jpg",
    },
    {
      title: "Finals Welfare",
      description:
        "Stress-relief, snacks and study support when exams close in.",
      imageUrl: "/images/Welfare.png",
    },
  ];

  return <Timeline events={events} />;
};

export default TimelineMain;
