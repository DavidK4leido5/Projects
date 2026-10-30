import type { Metadata } from "next";
import { Suspense } from "react";
import { Download, ShieldCheck } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Separator,
} from "@repo/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { DeleteAccountForm } from "@/features/settings/delete-account-form";
import { LogoForm } from "@/features/settings/logo-form";
import { PasswordForm } from "@/features/settings/password-form";
import { PreferencesForm } from "@/features/settings/preferences-form";
import { ProfileForm } from "@/features/settings/profile-form";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsBody />
    </Suspense>
  );
}

async function SettingsBody() {
  const user = await requireUser();
  const settings = await getSettings(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Profile, preferences, report branding, and your data."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>The name that appears across SpendWise and in reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Currency, locale, and the day your financial month begins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            currency={settings.currency}
            locale={settings.locale}
            firstDayOfWeek={settings.firstDayOfWeek}
            financialMonthStart={settings.financialMonthStart}
            theme={settings.theme}
            dateFormat={settings.dateFormat}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report branding</CardTitle>
          <CardDescription>Used in the header of generated PDF reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoForm currentUrl={settings.reportLogoUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Passwords are hashed and sessions are HTTP-only cookies handled by Neon Auth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Export everything as JSON. Receipt files stay in private object storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <a href="/api/export" download>
                <Download className="size-4" aria-hidden />
                Export all data
              </a>
            </Button>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Scoped to your account only
            </span>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">
                This deletes your financial data and receipt files. Managed Auth may keep the
                sign-in identity for support to remove. Export first if you want a copy.
              </p>
            </div>
            <DeleteAccountForm email={user.email} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
