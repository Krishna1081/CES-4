'use client'

import { LucideIcon, LucideProps } from 'lucide-react'

interface IconProps extends LucideProps {
  icon: LucideIcon
}

export function Icon({ icon: Icon, ...props }: IconProps) {
  return <Icon {...props} />
} 