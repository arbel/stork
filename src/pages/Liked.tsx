import { useSwipe } from "@/contexts/SwipeContext";
import { NameListLayout } from "@/components/NameListLayout";

const Liked = () => {
  const { likedNames } = useSwipe();

  return (
    <NameListLayout
      title="אהבתי"
      variant="liked"
      names={likedNames}
      bannerText="השמות האהובים עליכם"
      emptyTitle="עדיין אין מועדפים!"
      emptyText="החליקו ימינה על שמות שאתם אוהבים."
      ctaText="התחילו להחליק"
    />
  );
};

export default Liked;
