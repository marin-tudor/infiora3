import RoomPage from "@/views/rooms/details/RoomPage";
import { notFound } from "next/navigation";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const res = await fetch(`${baseUrl}/v1/rooms/${id}`, { cache: "no-store" });

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
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "linear-gradient(180deg, #f7f3ed 0%, #ffffff 100%)",
          }}
        >
          <section
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#ffffff",
              border: "1px solid #e7dfd1",
              borderRadius: 20,
              padding: 32,
              boxShadow: "0 20px 50px rgba(27, 24, 20, 0.08)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 12,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#8a7a61",
              }}
            >
              Room Unavailable
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: 30, color: "#201a12" }}>
              This guest page is currently unavailable.
            </h1>
            <p style={{ margin: 0, lineHeight: 1.7, color: "#635848" }}>
              The room may be inactive, expired, or temporarily hidden. Please
              contact the hotel front desk for a fresh access link.
            </p>
          </section>
        </main>
      );
    }
  }

  return <RoomPage room={room} links={room.links} />;
};

export default Page;
