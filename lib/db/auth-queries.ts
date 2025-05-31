import { eq, and } from 'drizzle-orm'
import { db } from './drizzle'
import { users, organizations, teamMembers, teams } from './schema'
import { hashPassword } from '@/lib/auth/session'
import type { SignUpInput } from '@/lib/auth/schemas'
import { generateVerificationToken } from '@/lib/auth/tokens'

export async function createUserWithOrganization(input: SignUpInput) {
  const { email, password, firstName, lastName, companyName } = input
  
  try {
    const hashedPassword = await hashPassword(password)
    const verificationToken = generateVerificationToken()
    
    return await db.transaction(async (tx) => {
      // Create organization
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: companyName,
        })
        .returning()

      // Create user
      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          role: 'owner',
          emailVerificationToken: verificationToken,
          emailVerified: false,
        })
        .returning()

      // Create team for backward compatibility
      const [team] = await tx
        .insert(teams)
        .values({
          name: `${companyName} Team`,
          organizationId: organization.id,
        })
        .returning()

      // Add user to team as owner
      await tx
        .insert(teamMembers)
        .values({
          userId: user.id,
          teamId: team.id,
          role: 'owner',
        })

      return {
        user,
        organization,
        team,
        verificationToken,
      }
    })
  } catch (error) {
    console.error('Error creating user with organization:', error)
    throw new Error('Failed to create account')
  }
}

export async function verifyUserEmail(token: string) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, token),
          eq(users.emailVerified, false)
        )
      )
      .limit(1)

    if (!user) {
      throw new Error('Invalid or expired verification token')
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning()

    return updatedUser
  } catch (error) {
    console.error('Error verifying email:', error)
    throw new Error('Failed to verify email')
  }
}

export async function findUserByEmail(email: string) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user || null
  } catch (error) {
    console.error('Error finding user by email:', error)
    return null
  }
}

export async function findUserById(id: number) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return user || null
  } catch (error) {
    console.error('Error finding user by ID:', error)
    return null
  }
}

export async function updateUserVerificationToken(
  email: string,
  token: string
) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerificationToken: token,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning()

    return updatedUser
  } catch (error) {
    console.error('Error updating verification token:', error)
    throw new Error('Failed to update verification token')
  }
}

export async function getUserWithOrganization(userId: number) {
  try {
    const result = await db
      .select({
        user: users,
        organization: organizations,
        team: teams,
      })
      .from(users)
      .innerJoin(teamMembers, eq(teamMembers.userId, users.id))
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .innerJoin(organizations, eq(organizations.id, teams.organizationId))
      .where(eq(users.id, userId))
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error('Error getting user with organization:', error)
    return null
  }
} 