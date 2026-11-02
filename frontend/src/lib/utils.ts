import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === "") return "₹0.00"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "₹0.00"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "—"
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d)
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "—"
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  } catch {
    return dateString
  }
}

