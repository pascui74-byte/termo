import * as React from 'react'

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-300 ${className}`}
      {...props}
    />
  )
}
