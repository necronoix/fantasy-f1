'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Translate common errors to Italian
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email o password errata' }
    }
    if (error.message.includes('Email not confirmed')) {
      // Auto-confirm the user if they exist but aren't confirmed
      const admin = createAdminClient()
      const { data: users } = await admin.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email === email)
      if (user && !user.email_confirmed_at) {
        await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
        // Retry login
        const { error: retryError } = await supabase.auth.signInWithPassword({ email, password })
        if (retryError) return { error: 'Email o password errata' }
        redirect('/dashboard')
      }
      return { error: 'Email o password errata' }
    }
    if (error.message.includes('too many requests') || error.message.includes('rate limit')) {
      return { error: 'Troppi tentativi. Riprova tra qualche minuto.' }
    }
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const displayName = (formData.get('display_name') as string).trim()

  if (!email || !password || !displayName) {
    return { error: 'Compila tutti i campi' }
  }
  if (password.length < 6) {
    return { error: 'La password deve avere almeno 6 caratteri' }
  }
  if (displayName.length < 2 || displayName.length > 30) {
    return { error: 'Il nome deve essere tra 2 e 30 caratteri' }
  }

  // Check if email already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)
  if (existingUser) {
    return { error: 'Questa email è già registrata. Prova ad accedere.' }
  }

  // Use admin API to create user with auto-confirm (bypasses email rate limits)
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm, no email needed
    user_metadata: { display_name: displayName },
  })

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      return { error: 'Questa email è già registrata. Prova ad accedere.' }
    }
    if (createError.message.includes('rate limit') || createError.message.includes('too many')) {
      return { error: 'Troppi tentativi. Riprova tra qualche minuto.' }
    }
    return { error: createError.message }
  }

  if (!newUser?.user) {
    return { error: 'Errore durante la registrazione. Riprova.' }
  }

  // Create profile entry
  await admin
    .from('profiles')
    .upsert({
      id: newUser.user.id,
      display_name: displayName,
    }, { onConflict: 'id' })

  return { success: 'Registrazione completata! Ora puoi accedere.' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
