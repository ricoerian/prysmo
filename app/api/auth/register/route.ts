import { query, initDb } from "@/app/_lib/db";
import { setSessionCookie } from "@/app/_lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    await initDb();
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await query<{ id: number }>(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [name, email, password_hash]
    );

    const userId = result.rows[0].id;
    await setSessionCookie({ userId, email, name, role: "user" });

    return Response.json({ data: { id: userId, name, email } }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
