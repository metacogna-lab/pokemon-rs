/**
 * API client wrapper. Uses VITE_API_BASE_URL from env, falls back to localhost:8080/v1.
 */
import {
  Configuration,
  DefaultApi,
} from "../../../agents/ts-client";

const basePath =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL)
    : "http://localhost:8080/v1";

const config = new Configuration({ basePath });
export const api = new DefaultApi(config);
