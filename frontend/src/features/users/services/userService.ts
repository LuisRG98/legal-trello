
import api from "../../../lib/api";
import type { Assignee, UserRole } from "../types/user.types";

export interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  nickname: string;
  role: UserRole;
  is_active: boolean;
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  nickname: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface UpdateUserStatusPayload {
  is_active: boolean;
}

export const userService = {
  // Lista todos los usuarios. Solo ADMIN.
  async getUsers(): Promise<ManagedUser[]> {
    const response = await api.get<ManagedUser[]>("/users");
    return response.data;
  },

  // Busca usuarios activos que pueden recibir asignaciones.
  async getAssignees(
    search: string,
    limit = 10,
  ): Promise<Assignee[]> {
    const response = await api.get<Assignee[]>(
      "/users/assignees",
      {
        params: {
          search,
          limit,
        },
      },
    );

    return response.data;
  },

  // Crea un usuario.
  async createUser(
    payload: CreateUserPayload,
  ): Promise<ManagedUser> {
    const response = await api.post<ManagedUser>(
      "/users",
      payload,
    );

    return response.data;
  },

  // Actualiza el rol.
  async updateRole(
    userId: string,
    payload: UpdateUserRolePayload,
  ): Promise<ManagedUser> {
    const response = await api.patch<ManagedUser>(
      `/users/${userId}/role`,
      payload,
    );

    return response.data;
  },

  // Activa o desactiva una cuenta.
  async updateStatus(
    userId: string,
    payload: UpdateUserStatusPayload,
  ): Promise<ManagedUser> {
    const response = await api.patch<ManagedUser>(
      `/users/${userId}/status`,
      payload,
    );

    return response.data;
  },
};
