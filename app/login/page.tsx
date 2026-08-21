"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code.includes("email-already-in-use"))
        setError("That email already has an account. Try logging in.");
      else if (code.includes("invalid-credential") || code.includes("wrong-password"))
        setError("Wrong email or password.");
      else if (code.includes("weak-password"))
        setError("Password should be at least 6 characters.");
      else if (code.includes("invalid-email"))
        setError("That doesn't look like a valid email.");
      else setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <a href="/" className="brand">
          <span className="brand__mark">Perch<span>.</span></span>
        </a>
      </nav>

      <div className="auth">
        <h1 className="auth__title">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="auth__sub">
          {mode === "signup"
            ? "Save keywords and track your eBay rank every day."
            : "Log in to see your tracked keywords."}
        </p>

        <form className="form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>

        <p className="auth__switch">
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <button
            className="linkbtn"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
            }}
          >
            {mode === "signup" ? "Log in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}