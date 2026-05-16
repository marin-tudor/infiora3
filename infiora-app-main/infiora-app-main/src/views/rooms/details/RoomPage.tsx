"use client";
import React from "react";
import { ILink, IRoom } from "@/types";
import { useRoom } from "@/contexts/RoomContext";
import RoomView from "./components/RoomView";

interface RoomPageProps {
  room: IRoom;
  links: ILink[];
}

const removeStarsFromStrings = (obj: any): any => {
  if (typeof obj === "string") {
    // Remove * from strings that are wrapped in *
    if (obj.startsWith("*") && obj.endsWith("*")) {
      return obj.replaceAll("*", "");
    }
    return obj;
  } else if (Array.isArray(obj)) {
    return obj.map((item) => removeStarsFromStrings(item));
  } else if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        removeStarsFromStrings(value),
      ])
    );
  }
  return obj;
};

const RoomPage: React.FC<RoomPageProps> = ({ room, links }) => {
  const { room: updateRoom, links: updatedLinks } = useRoom();

  if (!room || !links) return null;

  const cleanedRoom = removeStarsFromStrings(updateRoom || room);

  const cleanedLinks = removeStarsFromStrings(updatedLinks || links);

  return <RoomView room={cleanedRoom} links={cleanedLinks} />;
};

export default RoomPage;
