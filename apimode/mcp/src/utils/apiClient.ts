import axios from "axios";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export { API_BASE_URL };