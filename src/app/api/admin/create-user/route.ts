import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const msg =
        data.error?.message === 'EMAIL_EXISTS'
          ? 'Ya existe una cuenta con ese correo electrónico'
          : data.error?.message === 'WEAK_PASSWORD : Password should be at least 6 characters'
          ? 'La contraseña debe tener al menos 6 caracteres'
          : 'Error al crear el usuario en Firebase Auth';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ uid: data.localId });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
