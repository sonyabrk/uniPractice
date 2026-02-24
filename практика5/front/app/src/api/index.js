import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
    "accept": "application/json",
  }
});

export const api = {
  createUser: async (user) => {
    let response = await apiClient.post("/users", user);
    return response.data;
  },
  getUsers: async () => {
    let response = await apiClient.get("/users");
    return response.data;
  },
  getUserById: async (id) => {
    let response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
  updateUser: async (id, user) => {
    let response = await apiClient.patch(`/users/${id}`, user);
    return response.data;
  },
  deleteUser: async (id) => {
    await apiClient.delete(`/users/${id}`);
  }
};