import ChatSession from "@/components/chats/chat-session";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatSession threadId={id} />;
}
