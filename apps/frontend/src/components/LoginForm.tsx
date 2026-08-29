import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { AuthContext } from "@/context/auth/AuthContext"
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
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const auth = useContext(AuthContext)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      if (!auth) {
        throw new Error("認證模組尚未載入，請稍後再試。")
      }

      await auth.loginToken(email, password)
      navigate("/")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "登入失敗，請確認帳號密碼。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>帳號登入</CardTitle>
          <CardDescription>
            請輸入您的電子信箱與密碼以登入系統
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">電子信箱 / 使用者名稱</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  required
                />
              </Field>
              <Field className="flex flex-col gap-2 mt-2">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "登入中..." : "登入"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}