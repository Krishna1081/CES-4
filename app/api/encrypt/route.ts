import { NextResponse } from 'next/server'
import { z } from 'zod'
import { encrypt } from '@/lib/encryption'

const encryptSchema = z.object({
  text: z.string().min(1, 'Text to encrypt is required')
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text } = encryptSchema.parse(body)

    const encrypted = encrypt(text)

    return NextResponse.json({ encrypted })
  } catch (error) {
    console.error('Encryption error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to encrypt data' },
      { status: 500 }
    )
  }
} 