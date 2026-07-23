import { useSwipe } from "@/contexts/SwipeContext";
import { NameListLayout } from "@/components/NameListLayout";
import { toast } from "@/hooks/use-toast";

const Liked = () => {
  const { likedNames, addPassedName } = useSwipe();

  return (
    <NameListLayout
      title="אהבתי"
      variant="liked"
      names={likedNames}
      bannerText="השמות האהובים עליכם"
      tipText="💡 שיניתם את דעתכם? החליקו כרטיס שמאלה כדי לדלג על השם"
      emptyTitle="עדיין אין מועדפים!"
      emptyText="החליקו ימינה על שמות שאתם אוהבים."
      ctaText="התחילו להחליק"
      onRedecide={(name, action) => {
        if (action !== "pass") return;
        addPassedName(name);
        toast({
          title: "השם הועבר לדילוגים",
          description: `${name.displayName || name.name} עבר לרשימת ״דילגתי״.`,
        });
      }}
    />
  );
};

export default Liked;
