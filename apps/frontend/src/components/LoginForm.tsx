import { useState } from "react"
import { cn } from "@/lib/utils"
import { BACKEND_URL } from "@/lib/katanaFetch"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const authUrl = `${BACKEND_URL.replace(/\/+$|\/$/, '')}/auth/login`;
      const resp = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        // TODO: show user-friendly error
        alert(data.error || 'Login failed');
        return;
      }

      // If AuthContext is available, use it
      // Lazy import to avoid circular issues
      try {
        // Using window.dispatchEvent to notify provider is not ideal, so prefer context if available
      } catch (err) {
        console.log(err)
        // ignore
      }

      // If backend returns token, store in localStorage and navigate
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        // Optionally store username
        localStorage.setItem('auth_username', data.user?.username || username);
        // Navigate to home
        window.location.href = '/';
      } else {
        // No token returned — still navigate or show message
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Login error', err);
      alert('Login failed');
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>帳號登入</CardTitle>
          <CardDescription>
            請輸入您的使用者名稱與密碼以登入系統
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">使用者名稱</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="請輸入使用者名稱"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">密碼</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
                  >
                    忘記密碼？
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="請輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field className="flex flex-col gap-2 mt-2">
                <Button type="submit" className="w-full">
                  登入
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}