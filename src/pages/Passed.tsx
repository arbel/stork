import { useSwipe } from "@/contexts/SwipeContext";
import { NameListLayout } from "@/components/NameListLayout";
import { toast } from "@/hooks/use-toast";

const Passed = () => {
  const { passedNames, addLikedName, partnerLikes } = useSwipe();

  return (
    <NameListLayout
      title="דילגתי"
      variant="passed"
      names={passedNames}
      bannerText="שמות שדילגתם עליהם"
      tipText="💡 שיניתם את דעתכם? החליקו כרטיס ימינה כדי לאהוב את השם"
      emptyTitle="לא דילגתם על שמות!"
      emptyText="עדיין לא דילגתם על אף שם."
      ctaText="התחילו להחליק"
      onRedecide={(name, action) => {
        if (action !== "like") return;
        addLikedName(name);
        if (partnerLikes.includes(name.name)) {
          toast({
            title: "🎉 יש התאמה!",
            description: `גם בן/בת הזוג אהבו את ${name.displayName || name.name} — מצאו אותו בעמוד ההתאמות.`,
          });
        } else {
          toast({
            title: "השם נוסף למועדפים",
            description: `${name.displayName || name.name} עבר לרשימת ״אהבתי״.`,
          });
        }
      }}
    />
  );
};

export default Passed;
