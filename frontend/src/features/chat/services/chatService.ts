import api from "../../../lib/api";

export type ChatRoom = "general" | "management";

export interface ChatMessage {
  id: string;
  room: ChatRoom;
  author_id: string | null;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
  expires_at: string;
}

export interface SendChatMessagePayload {
  room: ChatRoom;
  content: string;
}

export const chatService = {
  async getMessages(room: ChatRoom): Promise<ChatMessage[]> {
    const response = await api.get<ChatMessage[]>(
      "/chat/" + room + "/messages",
    );
    return response.data;
  },

  async sendMessage(
    payload: SendChatMessagePayload,
  ): Promise<ChatMessage> {
    const response = await api.post<ChatMessage>(
      "/chat/" + payload.room + "/messages",
      { content: payload.content },
    );
    return response.data;
  },
};
