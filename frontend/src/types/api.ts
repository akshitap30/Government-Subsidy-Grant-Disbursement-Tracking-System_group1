export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  errors?: string[]
}

export interface PagedResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

