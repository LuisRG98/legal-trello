import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  chatService,
  type ChatRoom,
  type SendChatMessagePayload,
} from "../services/chatService";

export const chatKeys = {
  messages: (room: ChatRoom) => ["chat", "messages", room] as const,
};

export function useChatMessages(room: ChatRoom) {
  return useQuery({
    queryKey: chatKeys.messages(room),
    queryFn: () => chatService.getMessages(room),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendChatMessagePayload) =>
      chatService.sendMessage(payload),
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({
        queryKey: chatKeys.messages(payload.room),
      });
    },
  });
}
