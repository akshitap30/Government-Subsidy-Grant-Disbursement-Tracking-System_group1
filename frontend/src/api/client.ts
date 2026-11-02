import axios, { AxiosError } from 'axios'
import type { ApiResponse } from '@/types/api'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
})

// Response interceptor to handle errors systematically
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    let errorMessage = 'An unexpected error occurred'
    if (error.response?.data) {
      const data = error.response.data
      if (data.message) {
        errorMessage = data.message
      }
      if (data.errors && data.errors.length > 0) {
        errorMessage += `: ${data.errors.join(', ')}`
      }
    } else if (error.message) {
      if (error.message.includes('Network Error')) {
        errorMessage = 'Unable to connect to SGDTS backend service. Please ensure the Spring Boot server is running on port 8080.'
      } else {
        errorMessage = error.message
      }
    }
    return Promise.reject(new Error(errorMessage))
  }
)

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unknown error occurred'
}

