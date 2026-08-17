import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {AuthContext} from "@/context/auth/AuthContext";

export const Settings = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    authContext?.logoutToken();
    navigate("/login");
  };

  return (
    <PageLayout title="設定" id="settingsPage">
      <div className="grid gap-6">
        <div className="rounded-lg border border-muted-foreground/10 bg-muted p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-foreground">使用者</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {authContext?.isAuthenticated
                  ? `已登入：${authContext.username || "使用者"}`
                  : "您目前尚未登入。"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              // disabled={!authContext?.isAuthenticated}
              className="text-foreground"
            >
              登出
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}