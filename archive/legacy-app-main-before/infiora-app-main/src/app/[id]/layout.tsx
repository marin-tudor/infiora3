import { RoomProvider } from '@/contexts/RoomContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RoomProvider>{children}</RoomProvider>;
}
