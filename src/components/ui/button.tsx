import * as React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'secondary' | 'destructive' }

export function Button({ className = '', variant = 'default', ...props }: Props) {
  const variants: Record<string, string> = {
    default: 'bg-slate-900 text-white hover:opacity-90',
    secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  }
  return (
    <button
      className={`px-3 py-2 rounded-2xl text-sm transition ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
