import RoomPage from "@/views/rooms/details/RoomPage";
import { notFound } from "next/navigation";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

export const revalidate = 60;

export async function generateStaticParams() {
  const res = await fetch(`${baseUrl}/v1/rooms?limit=100`);
  const { results: rooms } = await res.json();

  return rooms.map((room: any) => ({
    id: room.id.toString(),
  }));
}

const Page = async ({ params }: { params: { id: string } }) => {
  const res = await fetch(`${baseUrl}/v1/rooms/${params.id}`);

  if (!res.ok) {
    return notFound();
  }

  const room = await res.json();

  if (room) {
    const currentDate = new Date();
    const activeUntil = room.hotel.activeUntil
      ? new Date(room.hotel.activeUntil)
      : currentDate;

    const isActive =
      activeUntil >= currentDate && room.hotel.isActive && room.isActive;

    if (!isActive) {
      return <>inactive</>;
    }
  }

  return <RoomPage room={room} links={room.links} />;
};

export default Page;
