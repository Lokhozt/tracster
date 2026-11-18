import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { MyVideos } from "@/components/VideoGallery";
import { getCurrentUser } from "@/lib/auth";
import { getMyChoreographyVideos } from "@/lib/choreography-resources";

/** Quick access to every video of the user's choreographies, without opening each one. */
export default async function VideosPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [tNavigation, t, videos] = await Promise.all([
    getTranslations("Navigation"),
    getTranslations("Pages.Videos"),
    getMyChoreographyVideos(user.id),
  ]);

  return (
    <AppShell title={tNavigation("videos")} wide>
      {videos.length === 0 ? (
        <Card>
          <p className="text-stone-600">{t("empty")}</p>
        </Card>
      ) : (
        <MyVideos videos={videos} />
      )}
    </AppShell>
  );
}
